package studio.gnosticdeveloper.bonusbissen.integration;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import studio.gnosticdeveloper.bonusbissen.dto.request.ApproveExchangeRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.CancelExchangeRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.ClaimRewardRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.UserCancelExchangeRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.ExchangeVerifyRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.GrantPointsRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.UserPointsAwardResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.UserPointsResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.PendingExchangeResponse;
import studio.gnosticdeveloper.bonusbissen.entity.User;
import studio.gnosticdeveloper.bonusbissen.entity.Employee;
import studio.gnosticdeveloper.bonusbissen.entity.EmployeeRole;
import studio.gnosticdeveloper.bonusbissen.entity.Reward;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Adversarial tests: a malicious or careless caller with a *valid but wrong-scoped*
 * token tries to do something they shouldn't be able to do. Several of these are
 * expected to FAIL against the current implementation — they document real gaps,
 * not just lock in existing behavior. See the report accompanying this commit.
 */
class AdversarialIntegrationTest extends AbstractIntegrationTest {

    private UserPointsResponse getBalance(String token, UUID userId) {
        return restTemplate
            .exchange(baseUrl() + "/users/" + userId, HttpMethod.GET, authed(token), UserPointsResponse.class)
            .getBody();
    }

    private void grant(String cashierToken, UUID userId, int points) {
        ResponseEntity<UserPointsAwardResponse> response = restTemplate.exchange(
            baseUrl() + "/users/grant",
            HttpMethod.POST,
            authed(cashierToken, new GrantPointsRequest(userId, points, null)),
            UserPointsAwardResponse.class
        );
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    private PendingExchangeResponse getSolePendingExchange(String employeeToken, UUID userId) {
        ResponseEntity<List<PendingExchangeResponse>> pending = restTemplate.exchange(
            baseUrl() + "/exchanges/pending/" + userId,
            HttpMethod.GET,
            authed(employeeToken),
            new org.springframework.core.ParameterizedTypeReference<>() {}
        );
        assertThat(pending.getBody()).hasSize(1);
        return pending.getBody().get(0);
    }

    // --- IDOR on /users/claim-reward: request body carries the target
    // userId with no check that it matches the caller's own identity. ---
    @Test
    void userCannotClaimRewardOnBehalfOfAnotherUser() {
        Employee cashier = createEmployee("cashier-idor-claim", "password123", EmployeeRole.CASHIER);
        String cashierToken = loginEmployee("cashier-idor-claim", "password123");

        User attacker = createUser("+5493462003001");
        String attackerToken = loginUser("+5493462003001");

        User victim = createUser("+5493462003002");
        grant(cashierToken, victim.getId(), 100);

        Reward reward = createReward("Free Cake", 30);

        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl() + "/users/claim-reward",
            HttpMethod.POST,
            authed(attackerToken, new ClaimRewardRequest(victim.getId(), reward.getId())),
            String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    // --- No balance check: a user with 0 points can still claim an
    // expensive reward, driving their balance negative for free. ---
    @Test
    void claimRewardWithInsufficientBalanceIsRejected() {
        Employee cashier = createEmployee("cashier-insufficient", "password123", EmployeeRole.CASHIER);
        loginEmployee("cashier-insufficient", "password123");

        User user = createUser("+5493462003003");
        String userToken = loginUser("+5493462003003");

        Reward reward = createReward("Expensive Reward", 1000);

        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl() + "/users/claim-reward",
            HttpMethod.POST,
            authed(userToken, new ClaimRewardRequest(user.getId(), reward.getId())),
            String.class
        );

        assertThat(response.getStatusCode()).isIn(HttpStatus.CONFLICT, HttpStatus.BAD_REQUEST, HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(getBalance(loginEmployee("cashier-insufficient", "password123"), user.getId()).points()).isZero();
    }

    // --- No active check on the reward being claimed. ---
    @Test
    void claimingADeactivatedRewardIsRejected() {
        Employee cashier = createEmployee("cashier-inactive-reward", "password123", EmployeeRole.CASHIER);
        String cashierToken = loginEmployee("cashier-inactive-reward", "password123");

        User user = createUser("+5493462003004");
        grant(cashierToken, user.getId(), 100);
        String userToken = loginUser("+5493462003004");

        Reward reward = createReward("Discontinued Reward", 30);
        reward.setActive(false);
        rewardRepository.save(reward);

        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl() + "/users/claim-reward",
            HttpMethod.POST,
            authed(userToken, new ClaimRewardRequest(user.getId(), reward.getId())),
            String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    // --- /exchanges/approve has no role restriction: a user token can
    // self-approve their own pending redemption by supplying any real
    // employeeId, bypassing in-person handoff entirely. ---
    @Test
    void userCannotSelfApproveTheirOwnExchange() {
        Employee cashier = createEmployee("cashier-self-approve", "password123", EmployeeRole.CASHIER);
        String cashierToken = loginEmployee("cashier-self-approve", "password123");

        User user = createUser("+5493462003005");
        grant(cashierToken, user.getId(), 100);
        String userToken = loginUser("+5493462003005");

        Reward reward = createReward("Self-Serve Reward", 30);
        restTemplate.exchange(
            baseUrl() + "/users/claim-reward",
            HttpMethod.POST,
            authed(userToken, new ClaimRewardRequest(user.getId(), reward.getId())),
            String.class
        );

        UUID exchangeId = getSolePendingExchange(cashierToken, user.getId()).id();

        ResponseEntity<Void> response = restTemplate.exchange(
            baseUrl() + "/exchanges/approve",
            HttpMethod.POST,
            authed(userToken, new ApproveExchangeRequest(exchangeId, cashier.getId())),
            Void.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    // --- Double refund: approving a redemption (reward handed over), then
    // cancelling it with a refund, pays the user back for a reward they
    // already received. No state-transition guard prevents this. ---
    @Test
    void cancellingAnAlreadyDeliveredExchangeIsRejected() {
        Employee cashier = createEmployee("cashier-double-refund", "password123", EmployeeRole.CASHIER);
        String cashierToken = loginEmployee("cashier-double-refund", "password123");

        User user = createUser("+5493462003006");
        grant(cashierToken, user.getId(), 100);
        String userToken = loginUser("+5493462003006");

        Reward reward = createReward("Delivered Reward", 30);
        restTemplate.exchange(
            baseUrl() + "/users/claim-reward",
            HttpMethod.POST,
            authed(userToken, new ClaimRewardRequest(user.getId(), reward.getId())),
            String.class
        );

        UUID exchangeId = getSolePendingExchange(cashierToken, user.getId()).id();

        restTemplate.exchange(
            baseUrl() + "/exchanges/approve",
            HttpMethod.POST,
            authed(cashierToken, new ApproveExchangeRequest(exchangeId, cashier.getId())),
            Void.class
        );

        ResponseEntity<Void> cancelResponse = restTemplate.exchange(
            baseUrl() + "/exchanges/cancel",
            HttpMethod.POST,
            authed(cashierToken, new CancelExchangeRequest(exchangeId, cashier.getId(), true)),
            Void.class
        );

        assertThat(cancelResponse.getStatusCode()).isIn(HttpStatus.CONFLICT, HttpStatus.BAD_REQUEST);
        assertThat(getBalance(cashierToken, user.getId()).points()).isEqualTo(70);
    }

    // --- Double refund via repeated cancellation: nothing stops the same
    // pending exchange from being cancelled-with-refund twice. ---
    @Test
    void cancellingTheSameExchangeTwiceOnlyRefundsOnce() {
        Employee cashier = createEmployee("cashier-double-cancel", "password123", EmployeeRole.CASHIER);
        String cashierToken = loginEmployee("cashier-double-cancel", "password123");

        User user = createUser("+5493462003007");
        grant(cashierToken, user.getId(), 100);
        String userToken = loginUser("+5493462003007");

        Reward reward = createReward("Cancel-Twice Reward", 30);
        restTemplate.exchange(
            baseUrl() + "/users/claim-reward",
            HttpMethod.POST,
            authed(userToken, new ClaimRewardRequest(user.getId(), reward.getId())),
            String.class
        );

        UUID exchangeId = getSolePendingExchange(cashierToken, user.getId()).id();

        restTemplate.exchange(
            baseUrl() + "/exchanges/cancel",
            HttpMethod.POST,
            authed(cashierToken, new CancelExchangeRequest(exchangeId, cashier.getId(), true)),
            Void.class
        );
        ResponseEntity<Void> secondCancel = restTemplate.exchange(
            baseUrl() + "/exchanges/cancel",
            HttpMethod.POST,
            authed(cashierToken, new CancelExchangeRequest(exchangeId, cashier.getId(), true)),
            Void.class
        );

        assertThat(secondCancel.getStatusCode()).isIn(HttpStatus.CONFLICT, HttpStatus.BAD_REQUEST);
        assertThat(getBalance(cashierToken, user.getId()).points()).isEqualTo(100);
    }

    // --- /exchanges/user-cancel never checks that the pending exchange
    // belongs to the calling user: any authenticated user can cancel
    // (and force-refund) a stranger's in-flight redemption. ---
    @Test
    void userCannotCancelAnotherUsersExchange() {
        Employee cashier = createEmployee("cashier-cross-cancel", "password123", EmployeeRole.CASHIER);
        String cashierToken = loginEmployee("cashier-cross-cancel", "password123");

        User victim = createUser("+5493462003008");
        grant(cashierToken, victim.getId(), 100);
        String victimToken = loginUser("+5493462003008");

        User attacker = createUser("+5493462003009");
        String attackerToken = loginUser("+5493462003009");

        Reward reward = createReward("Cross-Cancel Reward", 30);
        restTemplate.exchange(
            baseUrl() + "/users/claim-reward",
            HttpMethod.POST,
            authed(victimToken, new ClaimRewardRequest(victim.getId(), reward.getId())),
            String.class
        );

        UUID exchangeId = getSolePendingExchange(cashierToken, victim.getId()).id();

        ResponseEntity<Void> response = restTemplate.exchange(
            baseUrl() + "/exchanges/user-cancel",
            HttpMethod.POST,
            authed(attackerToken, new UserCancelExchangeRequest(exchangeId)),
            Void.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    // --- No ownership check on GET /users/{id}: any authenticated
    // user could view a stranger's balance by guessing/enumerating a UUID. ---
    @Test
    void userCannotViewAnotherUsersBalance() {
        User victim = createUser("+5493462003011");
        User attacker = createUser("+5493462003012");
        String attackerToken = loginUser("+5493462003012");

        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl() + "/users/" + victim.getId(),
            HttpMethod.GET,
            authed(attackerToken),
            String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    // --- No ownership check on DELETE /users/{id}: any authenticated
    // user could deactivate a stranger's account. ---
    @Test
    void userCannotDeactivateAnotherUsersAccount() {
        User victim = createUser("+5493462003013");
        User attacker = createUser("+5493462003014");
        String attackerToken = loginUser("+5493462003014");

        ResponseEntity<Void> response = restTemplate.exchange(
            baseUrl() + "/users/" + victim.getId(),
            HttpMethod.DELETE,
            authed(attackerToken),
            Void.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    // --- Employees are still allowed to look up any user (unlike
    // users, who are restricted to themselves above). ---
    @Test
    void employeeCanStillViewAnyUsersBalance() {
        Employee cashier = createEmployee("cashier-view-any", "password123", EmployeeRole.CASHIER);
        String cashierToken = loginEmployee("cashier-view-any", "password123");
        User user = createUser("+5493462003015");

        ResponseEntity<UserPointsResponse> response = restTemplate.exchange(
            baseUrl() + "/users/" + user.getId(),
            HttpMethod.GET,
            authed(cashierToken),
            UserPointsResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    // --- Baseline: an unauthenticated request to a protected endpoint must
    // never reach the service layer. ---
    @Test
    void unauthenticatedRequestToProtectedEndpointIsRejected() {
        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl() + "/exchanges",
            HttpMethod.GET,
            org.springframework.http.HttpEntity.EMPTY,
            String.class
        );

        assertThat(response.getStatusCode()).isIn(HttpStatus.FORBIDDEN, HttpStatus.UNAUTHORIZED);
    }

    // --- Malformed/garbage bearer token must not be treated as valid. ---
    @Test
    void tamperedTokenIsRejected() {
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setBearerAuth("this.is.not-a-real-jwt");
        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl() + "/exchanges",
            HttpMethod.GET,
            new org.springframework.http.HttpEntity<>(headers),
            String.class
        );

        assertThat(response.getStatusCode()).isIn(HttpStatus.FORBIDDEN, HttpStatus.UNAUTHORIZED);
    }

    // --- No validation on GrantPointsRequest.points: negative values aren't
    // rejected by the app at all. The DB's CHECK constraint happens to stop
    // the row from persisting, but there's no @ExceptionHandler for
    // DataIntegrityViolationException, so the failure surfaces as an
    // unhandled exception (a stack trace dumped to the logs) rather than a
    // clean 400 — the app should validate this itself before it ever reaches
    // the DB. ---
    @Test
    void grantingNegativePointsDoesNotCorruptBalanceEvenThoughErrorHandlingIsUgly() {
        Employee cashier = createEmployee("cashier-negative-grant", "password123", EmployeeRole.CASHIER);
        String cashierToken = loginEmployee("cashier-negative-grant", "password123");
        User user = createUser("+5493462003010");

        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl() + "/users/grant",
            HttpMethod.POST,
            authed(cashierToken, new GrantPointsRequest(user.getId(), -50, null)),
            String.class
        );

        assertThat(response.getStatusCode()).isNotEqualTo(HttpStatus.OK);
        assertThat(getBalance(cashierToken, user.getId()).points()).isZero();
    }

    // --- GET /exchanges has no role restriction: any authenticated user
    // could list every exchange in the system, across every other user. ---
    @Test
    void userCannotListAllExchanges() {
        User user = createUser("+5493462003016");
        String userToken = loginUser("+5493462003016");

        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl() + "/exchanges",
            HttpMethod.GET,
            authed(userToken),
            String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    // --- GET /exchanges/pending/{id} never checked that the id being queried
    // belonged to the calling user: a user token could enumerate any
    // other user's pending exchanges. ---
    @Test
    void userCannotViewAnotherUsersPendingExchanges() {
        Employee cashier = createEmployee("cashier-pending-idor", "password123", EmployeeRole.CASHIER);
        String cashierToken = loginEmployee("cashier-pending-idor", "password123");

        User victim = createUser("+5493462003017");
        grant(cashierToken, victim.getId(), 100);
        Reward reward = createReward("Pending IDOR Reward", 30);
        String victimToken = loginUser("+5493462003017");
        restTemplate.exchange(
            baseUrl() + "/users/claim-reward",
            HttpMethod.POST,
            authed(victimToken, new ClaimRewardRequest(victim.getId(), reward.getId())),
            String.class
        );

        User attacker = createUser("+5493462003018");
        String attackerToken = loginUser("+5493462003018");

        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl() + "/exchanges/pending/" + victim.getId(),
            HttpMethod.GET,
            authed(attackerToken),
            String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    // --- A user requesting their own pending exchanges must still work
    // (this endpoint is used by the user-facing "mis puntos" page). ---
    @Test
    void userCanViewTheirOwnPendingExchanges() {
        Employee cashier = createEmployee("cashier-own-pending", "password123", EmployeeRole.CASHIER);
        String cashierToken = loginEmployee("cashier-own-pending", "password123");

        User user = createUser("+5493462003019");
        grant(cashierToken, user.getId(), 100);
        Reward reward = createReward("Own Pending Reward", 30);
        String userToken = loginUser("+5493462003019");
        restTemplate.exchange(
            baseUrl() + "/users/claim-reward",
            HttpMethod.POST,
            authed(userToken, new ClaimRewardRequest(user.getId(), reward.getId())),
            String.class
        );

        ResponseEntity<List<PendingExchangeResponse>> response = restTemplate.exchange(
            baseUrl() + "/exchanges/pending/" + user.getId(),
            HttpMethod.GET,
            authed(userToken),
            new org.springframework.core.ParameterizedTypeReference<>() {}
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
    }

    // --- GET /exchanges/pending is the staff-facing review queue for every
    // user's pending redemptions; a user token must not see it. ---
    @Test
    void userCannotViewGlobalPendingQueue() {
        User user = createUser("+5493462003020");
        String userToken = loginUser("+5493462003020");

        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl() + "/exchanges/pending",
            HttpMethod.GET,
            authed(userToken),
            String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    // --- POST /exchanges/verify is the cashier-facing redemption-code lookup
    // used at pickup; a user token must not be able to call it directly. ---
    @Test
    void userCannotVerifyExchangeCode() {
        User user = createUser("+5493462003021");
        String userToken = loginUser("+5493462003021");

        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl() + "/exchanges/verify",
            HttpMethod.POST,
            authed(userToken, new ExchangeVerifyRequest("ABC123")),
            String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    // --- DELETE /rewards/{id} is ADMIN-only: a CASHIER token attempting to
    // deactivate a reward must be rejected, not just discouraged by the UI. ---
    @Test
    void cashierCannotDeleteReward() {
        Employee cashier = createEmployee("cashier-delete-reward", "password123", EmployeeRole.CASHIER);
        String cashierToken = loginEmployee("cashier-delete-reward", "password123");
        Reward reward = createReward("Cashier Cannot Delete Me", 30);

        ResponseEntity<Void> response = restTemplate.exchange(
            baseUrl() + "/rewards/" + reward.getId(),
            HttpMethod.DELETE,
            authed(cashierToken),
            Void.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }
}
