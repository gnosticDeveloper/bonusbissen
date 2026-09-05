package studio.gnosticdeveloper.bonusbissen.integration;

import org.junit.jupiter.api.Test;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import studio.gnosticdeveloper.bonusbissen.dto.request.ApproveExchangeRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.CancelExchangeRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.ClaimRewardRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.ExchangeVerifyRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.GrantPointsRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.UserPointsAwardResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.UserPointsResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.ExchangeResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.PendingExchangeResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.TopClientResponse;
import studio.gnosticdeveloper.bonusbissen.entity.User;
import studio.gnosticdeveloper.bonusbissen.entity.Employee;
import studio.gnosticdeveloper.bonusbissen.entity.EmployeeRole;
import studio.gnosticdeveloper.bonusbissen.entity.Reward;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class PointTransactionIntegrationTest extends AbstractIntegrationTest {

    private UserPointsResponse getBalance(String token, UUID userId) {
        return restTemplate
            .exchange(baseUrl() + "/users/" + userId, HttpMethod.GET, authed(token), UserPointsResponse.class)
            .getBody();
    }

    private UUID grant(String cashierToken, UUID userId, int points) {
        ResponseEntity<UserPointsAwardResponse> response = restTemplate.exchange(
            baseUrl() + "/users/grant",
            HttpMethod.POST,
            authed(cashierToken, new GrantPointsRequest(userId, points, null)),
            UserPointsAwardResponse.class
        );
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return userId;
    }

    private UUID claimReward(String userToken, UUID userId, UUID rewardId) {
        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl() + "/users/claim-reward",
            HttpMethod.POST,
            authed(userToken, new ClaimRewardRequest(userId, rewardId)),
            String.class
        );
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotBlank();
        return userId;
    }

    private PendingExchangeResponse getSolePendingExchange(String employeeToken, UUID userId) {
        ResponseEntity<List<PendingExchangeResponse>> pending = restTemplate.exchange(
            baseUrl() + "/exchanges/pending/" + userId,
            HttpMethod.GET,
            authed(employeeToken),
            new ParameterizedTypeReference<>() {}
        );
        assertThat(pending.getBody()).hasSize(1);
        return pending.getBody().get(0);
    }

    @Test
    void grantPointsIncreasesUserBalance() {
        Employee cashier = createEmployee("cashier-grant", "password123", EmployeeRole.CASHIER);
        String token = loginEmployee("cashier-grant", "password123");
        User user = createUser("+5493462001001");

        grant(token, user.getId(), 100);

        assertThat(getBalance(token, user.getId()).points()).isEqualTo(100);
    }

    @Test
    void grantPointsToInactiveUserReturnsNotFound() {
        Employee cashier = createEmployee("cashier-grant-inactive", "password123", EmployeeRole.CASHIER);
        String token = loginEmployee("cashier-grant-inactive", "password123");
        User user = createInactiveUser("+5493462002001");

        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl() + "/users/grant",
            HttpMethod.POST,
            authed(token, new GrantPointsRequest(user.getId(), 50, null)),
            String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void searchExcludesInactiveUsers() {
        Employee cashier = createEmployee("cashier-lookup-inactive", "password123", EmployeeRole.CASHIER);
        String token = loginEmployee("cashier-lookup-inactive", "password123");
        createInactiveUser("+5493462002002");

        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl() + "/users?search=" + "%2B5493462002002",
            HttpMethod.GET,
            authed(token),
            String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).doesNotContain("5493462002002");
    }

    @Test
    void claimRewardWithStaleTokenAfterDeactivationIsRejected() {
        // JwtAuthFilter re-resolves the token's principal against the DB on every
        // request (see PrincipalResolver); once active=false the principal no longer
        // resolves, so the request falls through as anonymous and Spring Security
        // rejects it here, before UserService.claimReward's own active check
        // would ever run.
        Employee admin = createEmployee("admin-deactivate", "password123", EmployeeRole.ADMIN);
        String adminToken = loginEmployee("admin-deactivate", "password123");
        Employee cashier = createEmployee("cashier-deactivate", "password123", EmployeeRole.CASHIER);
        String cashierToken = loginEmployee("cashier-deactivate", "password123");

        User user = createUser("+5493462002003");
        grant(cashierToken, user.getId(), 100);
        String userToken = loginUser("+5493462002003");

        Reward reward = createReward("Free Croissant", 30);

        restTemplate.exchange(
            baseUrl() + "/users/" + user.getId(),
            HttpMethod.DELETE,
            authed(adminToken),
            Void.class
        );

        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl() + "/users/claim-reward",
            HttpMethod.POST,
            authed(userToken, new ClaimRewardRequest(user.getId(), reward.getId())),
            String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void claimRewardOnBehalfOfAnotherUserIsRejectedRegardlessOfTheirActiveStatus() {
        // claim-reward now requires the caller's own id to match the target
        // userId (see AdversarialIntegrationTest), so that check fires
        // before UserService.claimReward's own active-user check ever
        // gets a chance to run — 403, not 404.
        Employee cashier = createEmployee("cashier-claim-inactive", "password123", EmployeeRole.CASHIER);
        String cashierToken = loginEmployee("cashier-claim-inactive", "password123");
        User requester = createUser("+5493462002004");
        String requesterToken = loginUser("+5493462002004");
        User inactiveUser = createInactiveUser("+5493462002005");
        Reward reward = createReward("Free Scone", 30);

        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl() + "/users/claim-reward",
            HttpMethod.POST,
            authed(requesterToken, new ClaimRewardRequest(inactiveUser.getId(), reward.getId())),
            String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void grantPointsRequiresCashierOrAdminRole() {
        User user = createUser("+5493462001002");
        String userToken = loginUser("+5493462001002");

        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl() + "/users/grant",
            HttpMethod.POST,
            authed(userToken, new GrantPointsRequest(user.getId(), 50, null)),
            String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void claimRewardCreatesPendingExchangeAndDecrementsBalance() {
        Employee cashier = createEmployee("cashier-claim", "password123", EmployeeRole.CASHIER);
        String cashierToken = loginEmployee("cashier-claim", "password123");
        User user = createUser("+5493462001003");
        grant(cashierToken, user.getId(), 100);

        Reward reward = createReward("Free Coffee", 30);
        String userToken = loginUser("+5493462001003");
        claimReward(userToken, user.getId(), reward.getId());

        assertThat(getBalance(userToken, user.getId()).points()).isEqualTo(70);

        PendingExchangeResponse pending = getSolePendingExchange(cashierToken, user.getId());
        assertThat(pending.rewardTitle()).isEqualTo("Free Coffee");
        assertThat(pending.points()).isEqualTo(-30);
        assertThat(pending.exchangeCode()).hasSize(6);
    }

    @Test
    void employeeApproveExchangeMarksItDelivered() {
        Employee cashier = createEmployee("cashier-approve", "password123", EmployeeRole.CASHIER);
        String cashierToken = loginEmployee("cashier-approve", "password123");
        User user = createUser("+5493462001004");
        grant(cashierToken, user.getId(), 50);

        Reward reward = createReward("Free Muffin", 20);
        String userToken = loginUser("+5493462001004");
        claimReward(userToken, user.getId(), reward.getId());

        UUID exchangeId = getSolePendingExchange(cashierToken, user.getId()).id();

        ResponseEntity<Void> approve = restTemplate.exchange(
            baseUrl() + "/exchanges/approve",
            HttpMethod.POST,
            authed(cashierToken, new ApproveExchangeRequest(exchangeId, cashier.getId())),
            Void.class
        );
        assertThat(approve.getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<List<ExchangeResponse>> all = restTemplate.exchange(
            baseUrl() + "/exchanges",
            HttpMethod.GET,
            authed(cashierToken),
            new ParameterizedTypeReference<>() {}
        );
        ExchangeResponse approved = all.getBody().stream().filter(e -> e.id().equals(exchangeId)).findFirst().orElseThrow();
        assertThat(approved.state()).isEqualTo("delivered");
    }

    @Test
    void employeeCancelExchangeWithRefundRestoresBalance() {
        Employee cashier = createEmployee("cashier-cancel", "password123", EmployeeRole.CASHIER);
        String cashierToken = loginEmployee("cashier-cancel", "password123");
        User user = createUser("+5493462001005");
        grant(cashierToken, user.getId(), 40);

        Reward reward = createReward("Free Tea", 25);
        String userToken = loginUser("+5493462001005");
        claimReward(userToken, user.getId(), reward.getId());

        UUID exchangeId = getSolePendingExchange(cashierToken, user.getId()).id();

        ResponseEntity<Void> cancel = restTemplate.exchange(
            baseUrl() + "/exchanges/cancel",
            HttpMethod.POST,
            authed(cashierToken, new CancelExchangeRequest(exchangeId, cashier.getId(), true)),
            Void.class
        );
        assertThat(cancel.getStatusCode()).isEqualTo(HttpStatus.OK);

        assertThat(getBalance(cashierToken, user.getId()).points()).isEqualTo(40);
    }

    @Test
    void employeeCancelExchangeWithoutRefundLeavesBalanceReduced() {
        Employee cashier = createEmployee("cashier-cancel-norefund", "password123", EmployeeRole.CASHIER);
        String cashierToken = loginEmployee("cashier-cancel-norefund", "password123");
        User user = createUser("+5493462001006");
        grant(cashierToken, user.getId(), 40);

        Reward reward = createReward("Free Juice", 25);
        String userToken = loginUser("+5493462001006");
        claimReward(userToken, user.getId(), reward.getId());

        UUID exchangeId = getSolePendingExchange(cashierToken, user.getId()).id();

        restTemplate.exchange(
            baseUrl() + "/exchanges/cancel",
            HttpMethod.POST,
            authed(cashierToken, new CancelExchangeRequest(exchangeId, cashier.getId(), false)),
            Void.class
        );

        assertThat(getBalance(cashierToken, user.getId()).points()).isEqualTo(15);
    }

    @Test
    void userCancelExchangeAlwaysRefundsPoints() {
        Employee cashier = createEmployee("cashier-user-cancel", "password123", EmployeeRole.CASHIER);
        String cashierToken = loginEmployee("cashier-user-cancel", "password123");
        User user = createUser("+5493462001007");
        grant(cashierToken, user.getId(), 60);

        Reward reward = createReward("Free Sandwich", 45);
        String userToken = loginUser("+5493462001007");
        claimReward(userToken, user.getId(), reward.getId());

        UUID exchangeId = getSolePendingExchange(cashierToken, user.getId()).id();

        ResponseEntity<Void> response = restTemplate.exchange(
            baseUrl() + "/exchanges/user-cancel",
            HttpMethod.POST,
            authed(userToken, new studio.gnosticdeveloper.bonusbissen.dto.request.UserCancelExchangeRequest(exchangeId)),
            Void.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(getBalance(userToken, user.getId()).points()).isEqualTo(60);
    }

    @Test
    void verifyExchangeWithValidCodeReturnsTheTransaction() {
        Employee cashier = createEmployee("cashier-verify-ok", "password123", EmployeeRole.CASHIER);
        String cashierToken = loginEmployee("cashier-verify-ok", "password123");
        User user = createUser("+5493462001008");
        grant(cashierToken, user.getId(), 30);

        Reward reward = createReward("Free Bagel", 15);
        String userToken = loginUser("+5493462001008");
        claimReward(userToken, user.getId(), reward.getId());

        String code = getSolePendingExchange(cashierToken, user.getId()).exchangeCode();

        ResponseEntity<ExchangeResponse> response = restTemplate.exchange(
            baseUrl() + "/exchanges/verify",
            HttpMethod.POST,
            authed(cashierToken, new ExchangeVerifyRequest(code)),
            ExchangeResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().rewardTitle()).isEqualTo("Free Bagel");
        assertThat(response.getBody().state()).isEqualTo("pending");
    }

    @Test
    void verifyExchangeWithUnknownCodeReturnsNotFound() {
        Employee cashier = createEmployee("cashier-verify-404", "password123", EmployeeRole.CASHIER);
        String token = loginEmployee("cashier-verify-404", "password123");

        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl() + "/exchanges/verify",
            HttpMethod.POST,
            authed(token, new ExchangeVerifyRequest("000000")),
            String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void topRewardsAndTopClientsRequireCashierOrAdminRole() {
        User user = createUser("+5493462001009");
        String userToken = loginUser("+5493462001009");

        ResponseEntity<String> topRewards = restTemplate.exchange(
            baseUrl() + "/rewards/top",
            HttpMethod.GET,
            authed(userToken),
            String.class
        );
        ResponseEntity<String> topClients = restTemplate.exchange(
            baseUrl() + "/users/top",
            HttpMethod.GET,
            authed(userToken),
            String.class
        );

        assertThat(topRewards.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(topClients.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void topClientsRanksByPointsEarnedDescending() {
        Employee cashier = createEmployee("cashier-top-clients", "password123", EmployeeRole.CASHIER);
        String token = loginEmployee("cashier-top-clients", "password123");
        User bigSpender = createUser("+5493462001010");
        User smallSpender = createUser("+5493462001011");

        grant(token, bigSpender.getId(), 100_000);
        grant(token, smallSpender.getId(), 1);

        ResponseEntity<List<TopClientResponse>> response = restTemplate.exchange(
            baseUrl() + "/users/top",
            HttpMethod.GET,
            authed(token),
            new ParameterizedTypeReference<>() {}
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        List<TopClientResponse> ranking = response.getBody();
        assertThat(ranking).isNotEmpty();
        assertThat(ranking.get(0).id()).isEqualTo(bigSpender.getId());
    }

    @Test
    void topRewardsRanksByClaimCountDescending() {
        Employee cashier = createEmployee("cashier-top-rewards", "password123", EmployeeRole.CASHIER);
        String cashierToken = loginEmployee("cashier-top-rewards", "password123");
        User user = createUser("+5493462001012");
        grant(cashierToken, user.getId(), 1000);
        String userToken = loginUser("+5493462001012");

        Reward popular = createReward("Popular Reward", 10);
        Reward rare = createReward("Rare Reward", 10);

        claimReward(userToken, user.getId(), popular.getId());
        claimReward(userToken, user.getId(), popular.getId());
        claimReward(userToken, user.getId(), rare.getId());

        ResponseEntity<List<studio.gnosticdeveloper.bonusbissen.dto.response.TopRewardResponse>> response = restTemplate.exchange(
            baseUrl() + "/rewards/top",
            HttpMethod.GET,
            authed(cashierToken),
            new ParameterizedTypeReference<>() {}
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        var ranking = response.getBody();
        var popularEntry = ranking.stream().filter(r -> r.id().equals(popular.getId())).findFirst().orElseThrow();
        var rareEntry = ranking.stream().filter(r -> r.id().equals(rare.getId())).findFirst().orElseThrow();
        assertThat(popularEntry.claimCount()).isEqualTo(2);
        assertThat(rareEntry.claimCount()).isEqualTo(1);
    }
}
