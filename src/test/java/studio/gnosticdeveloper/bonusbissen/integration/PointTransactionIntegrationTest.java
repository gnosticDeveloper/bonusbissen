package studio.gnosticdeveloper.bonusbissen.integration;

import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import studio.gnosticdeveloper.bonusbissen.dto.request.ApproveExchangeRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.ApproveExchangeWithCodeRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.CancelExchangeRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.ClaimRewardRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.ExchangeVerifyRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.GrantPointsRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.GrantPointsUpdateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.UserCancelExchangeRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.PointActionResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.MovementResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.PagedResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.TopRewardResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.UserPointsAwardResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.UserPointsResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.ExchangeResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.PendingExchangeResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.PendingExchangeQueueResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.PendingExchangeReviewResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.UnclaimedRewardResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.HomeStatsResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.TopClientResponse;
import studio.gnosticdeveloper.bonusbissen.entity.User;
import studio.gnosticdeveloper.bonusbissen.entity.StaffRole;
import studio.gnosticdeveloper.bonusbissen.entity.Storefront;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.entity.PointProgram;
import studio.gnosticdeveloper.bonusbissen.entity.Reward;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

class PointTransactionIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private JdbcTemplate jdbc;

    private UserPointsResponse getBalance(String token, UUID userId) {
        return restTemplate
            .exchange(baseUrl() + "/users/" + userId + "?programId=" + defaultProgram().getId(), HttpMethod.GET, authed(token), UserPointsResponse.class)
            .getBody();
    }

    private UUID grant(String cashierToken, UUID userId, int points) {
        joinProgram(userId, defaultProgram());
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
        User cashier = createEmployee("cashier-grant", "password123", StaffRole.CASHIER);
        String token = loginEmployee("cashier-grant", "password123");
        User user = createUser("+5493462001001");

        grant(token, user.getId(), 100);

        assertThat(getBalance(token, user.getId()).points()).isEqualTo(100);
    }

    @Test
    void correctionAppendsSignedDeltaAndPreservesOriginal() {
        createEmployee("cashier-correction", "password123", StaffRole.CASHIER);
        String token = loginEmployee("cashier-correction", "password123");
        User user = createUser("+5493462001099");
        grant(token, user.getId(), 100);
        UUID originalId = restTemplate.exchange(
            baseUrl() + "/users/grant/history?of=" + user.getId(), HttpMethod.GET, authed(token),
            new ParameterizedTypeReference<List<PointActionResponse>>() {}
        ).getBody().get(0).id();

        ResponseEntity<PointActionResponse> corrected = restTemplate.exchange(
            baseUrl() + "/users/grant/" + originalId, HttpMethod.PATCH,
            authed(token, new GrantPointsUpdateRequest(40, "error de carga")), PointActionResponse.class
        );
        assertThat(corrected.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(corrected.getBody().type()).isEqualTo("edit");
        assertThat(corrected.getBody().amount()).isEqualTo(-60);
        assertThat(corrected.getBody().correctedTransaction().id()).isEqualTo(originalId);
        assertThat(corrected.getBody().correctedTransaction().amount()).isEqualTo(100);
        assertThat(getBalance(token, user.getId()).points()).isEqualTo(40);

        ResponseEntity<String> missingNote = restTemplate.exchange(
            baseUrl() + "/users/grant/" + originalId, HttpMethod.PATCH,
            authed(token, new GrantPointsUpdateRequest(20, "")), String.class
        );
        assertThat(missingNote.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        ResponseEntity<String> insufficient = restTemplate.exchange(
            baseUrl() + "/users/grant/" + originalId, HttpMethod.PATCH,
            authed(token, new GrantPointsUpdateRequest(-10, "ajuste")), String.class
        );
        assertThat(insufficient.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(insufficient.getBody()).contains("La resta supera el saldo disponible.", "Saldo disponible: 40 puntos")
            .doesNotContain("allowDebt");
        assertThat(getBalance(token, user.getId()).points()).isEqualTo(40);

        List<PointActionResponse> history = restTemplate.exchange(
            baseUrl() + "/users/grant/history?of=" + user.getId(), HttpMethod.GET, authed(token),
            new ParameterizedTypeReference<List<PointActionResponse>>() {}
        ).getBody();
        assertThat(history).extracting(PointActionResponse::id).contains(originalId, corrected.getBody().id());
        PointActionResponse original = history.stream().filter(h -> h.id().equals(originalId)).findFirst().orElseThrow();
        assertThat(original.amount()).isEqualTo(100);
        assertThat(original.effectiveAmount()).isEqualTo(40);
        assertThat(history.stream().filter(h -> h.id().equals(corrected.getBody().id())).findFirst().orElseThrow().effectiveAmount())
            .isEqualTo(-60);

        List<MovementResponse> movements = restTemplate.exchange(
            baseUrl() + "/users/" + user.getId() + "/movements?storefrontId=" + defaultStorefront().getId(),
            HttpMethod.GET, authed(token), new ParameterizedTypeReference<List<MovementResponse>>() {}
        ).getBody();
        MovementResponse correctionMovement = movements.stream().filter(MovementResponse::correction).findFirst().orElseThrow();
        assertThat(correctionMovement.correctedTransactionId()).isEqualTo(originalId);
        assertThat(correctionMovement.title()).isEqualTo("Corrección de puntos");
        assertThat(correctionMovement.points()).isEqualTo(-60);

        ResponseEntity<String> delete = restTemplate.exchange(
            baseUrl() + "/users/grant/" + originalId, HttpMethod.DELETE, authed(token), String.class
        );
        assertThat(delete.getStatusCode()).isEqualTo(HttpStatus.METHOD_NOT_ALLOWED);
    }

    @Test
    void manualDebitAndDebtConfirmation() {
        createEmployee("cashier-debit", "password123", StaffRole.CASHIER);
        String token = loginEmployee("cashier-debit", "password123");
        User user = createUser("+5493462001098");
        grant(token, user.getId(), 30);

        ResponseEntity<String> rejected = restTemplate.exchange(baseUrl() + "/users/grant", HttpMethod.POST,
            authed(token, new GrantPointsRequest(user.getId(), -40, "ajuste")), String.class);
        assertThat(rejected.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(rejected.getBody()).contains("La resta supera el saldo disponible.", "Saldo disponible: 30 puntos")
            .doesNotContain("allowDebt");

        ResponseEntity<UserPointsAwardResponse> accepted = restTemplate.exchange(baseUrl() + "/users/grant", HttpMethod.POST,
            authed(token, new GrantPointsRequest(user.getId(), -40, "ajuste", true)), UserPointsAwardResponse.class);
        assertThat(accepted.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(getBalance(token, user.getId()).points()).isEqualTo(-10);
        List<PointActionResponse> history = restTemplate.exchange(baseUrl() + "/users/grant/history?of=" + user.getId(),
            HttpMethod.GET, authed(token), new ParameterizedTypeReference<List<PointActionResponse>>() {}).getBody();
        assertThat(history).anySatisfy(action -> {
            assertThat(action.type()).isEqualTo("subtract");
            assertThat(action.amount()).isEqualTo(-40);
        });
    }

    @Test
    void grantPointsToInactiveUserReturnsNotFound() {
        User cashier = createEmployee("cashier-grant-inactive", "password123", StaffRole.CASHIER);
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
    void correctionToZeroFullyReversesGrantWithoutDeletingIt() {
        createEmployee("cashier-reversal", "password123", StaffRole.CASHIER);
        String token = loginEmployee("cashier-reversal", "password123");
        User user = createUser("+5493462001095");
        grant(token, user.getId(), 100);
        UUID originalId = restTemplate.exchange(baseUrl() + "/users/grant/history?of=" + user.getId(),
            HttpMethod.GET, authed(token), new ParameterizedTypeReference<List<PointActionResponse>>() {})
            .getBody().get(0).id();

        ResponseEntity<PointActionResponse> correction = restTemplate.exchange(baseUrl() + "/users/grant/" + originalId,
            HttpMethod.PATCH, authed(token, new GrantPointsUpdateRequest(0, "anulación completa")), PointActionResponse.class);

        assertThat(correction.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(correction.getBody().amount()).isEqualTo(-100);
        assertThat(correction.getBody().correctedTransaction().id()).isEqualTo(originalId);
        assertThat(getBalance(token, user.getId()).points()).isZero();
        List<PointActionResponse> history = restTemplate.exchange(baseUrl() + "/users/grant/history?of=" + user.getId(),
            HttpMethod.GET, authed(token), new ParameterizedTypeReference<List<PointActionResponse>>() {}).getBody();
        assertThat(history.stream().filter(action -> action.id().equals(originalId)).findFirst().orElseThrow().amount()).isEqualTo(100);
        assertThat(history.stream().filter(action -> action.id().equals(originalId)).findFirst().orElseThrow().effectiveAmount()).isZero();
    }

    @Test
    void correctingManualDebitKeepsSignedOriginalAndAppendsDifference() {
        createEmployee("cashier-debit-correction", "password123", StaffRole.CASHIER);
        String token = loginEmployee("cashier-debit-correction", "password123");
        User user = createUser("+5493462001096");
        grant(token, user.getId(), 100);
        restTemplate.exchange(baseUrl() + "/users/grant", HttpMethod.POST,
            authed(token, new GrantPointsRequest(user.getId(), -30, "retiro")), UserPointsAwardResponse.class);
        List<PointActionResponse> before = restTemplate.exchange(baseUrl() + "/users/grant/history?of=" + user.getId(),
            HttpMethod.GET, authed(token), new ParameterizedTypeReference<List<PointActionResponse>>() {}).getBody();
        UUID debitId = before.stream().filter(action -> action.amount() == -30).findFirst().orElseThrow().id();

        ResponseEntity<PointActionResponse> corrected = restTemplate.exchange(baseUrl() + "/users/grant/" + debitId,
            HttpMethod.PATCH, authed(token, new GrantPointsUpdateRequest(-50, "faltaban 20")), PointActionResponse.class);

        assertThat(corrected.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(corrected.getBody().type()).isEqualTo("edit");
        assertThat(corrected.getBody().amount()).isEqualTo(-20);
        assertThat(corrected.getBody().correctedTransaction().id()).isEqualTo(debitId);
        assertThat(corrected.getBody().correctedTransaction().amount()).isEqualTo(-30);
        assertThat(getBalance(token, user.getId()).points()).isEqualTo(50);
    }

    @Test
    void staffSearchWithoutProgramUsesSelectedStorefrontBalance() {
        createEmployee("cashier-search-balance", "password123", StaffRole.CASHIER);
        String token = loginEmployee("cashier-search-balance", "password123");
        User user = createUser("+5493462001097");
        grant(token, user.getId(), 65);

        PagedResponse<UserPointsResponse> result = restTemplate.exchange(
            baseUrl() + "/users?search={search}", HttpMethod.GET, authed(token),
            new ParameterizedTypeReference<PagedResponse<UserPointsResponse>>() {}, "+5493462001097"
        ).getBody();

        assertThat(result.items()).anySatisfy(found -> {
            assertThat(found.id()).isEqualTo(user.getId());
            assertThat(found.points()).isEqualTo(65);
        });
    }

    @Test
    void searchExcludesInactiveUsers() {
        User cashier = createEmployee("cashier-lookup-inactive", "password123", StaffRole.CASHIER);
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
    void searchExcludesStaffAccounts() {
        User cashier = createEmployee("cashier-search-self", "password123", StaffRole.CASHIER);
        String token = loginEmployee("cashier-search-self", "password123");

        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl() + "/users?search=cashier-search-self",
            HttpMethod.GET,
            authed(token),
            String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).doesNotContain("cashier-search-self");
    }

    @Test
    void topClientsExcludesStaffAccountsEvenIfTheyHoldPoints() {
        User cashier = createEmployee("cashier-top-self-staff", "password123", StaffRole.CASHIER);
        String token = loginEmployee("cashier-top-self-staff", "password123");

        grant(token, cashier.getId(), 999_999);

        ResponseEntity<List<TopClientResponse>> response = restTemplate.exchange(
            baseUrl() + "/users/top",
            HttpMethod.GET,
            authed(token),
            new ParameterizedTypeReference<>() {}
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).extracting(TopClientResponse::id).doesNotContain(cashier.getId());
    }

    @Test
    void claimRewardWithStaleTokenAfterDeactivationIsRejected() {
        // JwtAuthFilter re-resolves the token's principal against the DB on every
        // request (see PrincipalResolver); once active=false the principal no longer
        // resolves, so the request falls through as anonymous and Spring Security
        // rejects it here, before UserService.claimReward's own active check
        // would ever run.
        User admin = createEmployee("admin-deactivate", "password123", StaffRole.ADMIN);
        String adminToken = loginEmployee("admin-deactivate", "password123");
        User cashier = createEmployee("cashier-deactivate", "password123", StaffRole.CASHIER);
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
        User cashier = createEmployee("cashier-claim-inactive", "password123", StaffRole.CASHIER);
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
        User cashier = createEmployee("cashier-claim", "password123", StaffRole.CASHIER);
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
        User cashier = createEmployee("cashier-approve", "password123", StaffRole.CASHIER);
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
            authed(cashierToken, new ApproveExchangeRequest(exchangeId)),
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
        User cashier = createEmployee("cashier-cancel", "password123", StaffRole.CASHIER);
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
            authed(cashierToken, new CancelExchangeRequest(exchangeId, true)),
            Void.class
        );
        assertThat(cancel.getStatusCode()).isEqualTo(HttpStatus.OK);

        assertThat(getBalance(cashierToken, user.getId()).points()).isEqualTo(40);
    }

    @Test
    void employeeCancelExchangeWithoutRefundLeavesBalanceReduced() {
        User cashier = createEmployee("cashier-cancel-norefund", "password123", StaffRole.CASHIER);
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
            authed(cashierToken, new CancelExchangeRequest(exchangeId, false)),
            Void.class
        );

        assertThat(getBalance(cashierToken, user.getId()).points()).isEqualTo(15);
    }

    @Test
    void userCancelExchangeAlwaysRefundsPoints() {
        User cashier = createEmployee("cashier-user-cancel", "password123", StaffRole.CASHIER);
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
            authed(userToken, new UserCancelExchangeRequest(exchangeId)),
            Void.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(getBalance(userToken, user.getId()).points()).isEqualTo(60);
    }

    @Test
    void verifyExchangeWithValidCodeReturnsTheTransaction() {
        User cashier = createEmployee("cashier-verify-ok", "password123", StaffRole.CASHIER);
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
        User cashier = createEmployee("cashier-verify-404", "password123", StaffRole.CASHIER);
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
        User cashier = createEmployee("cashier-top-clients", "password123", StaffRole.CASHIER);
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

    /**
     * Uses its own organization -- /rewards/top is a top-10-for-the-org ranking, and in the
     * shared default org claims made by other tests can push a 1-claim reward out of the
     * top 10 depending on test order.
     */
    @Test
    void topRewardsRanksByClaimCountDescending() {
        Organization organization = new Organization();
        organization.setName("Top Rewards Org");
        organization = organizationRepository.save(organization);

        PointProgram program = new PointProgram();
        program.setOrganization(organization);
        program.setName("Top Rewards Points");
        program = pointProgramRepository.save(program);

        Storefront storefront = new Storefront();
        storefront.setOrganization(organization);
        storefront.setName("Top Rewards Storefront");
        storefront.setAddress("1 Top St");
        storefront.setPointProgram(program);
        storefront = storefrontRepository.save(storefront);

        createEmployee("cashier-top-rewards", "password123", StaffRole.CASHIER, organization, storefront);
        String cashierToken = loginEmployee("cashier-top-rewards", "password123", organization.getId());
        User user = createUser("+5493462001012");
        String userToken = loginUser("+5493462001012");

        Reward popular = createRewardIn(program, "Popular Reward", 10);
        Reward rare = createRewardIn(program, "Rare Reward", 10);

        joinProgram(user.getId(), program);
        restTemplate.exchange(
            baseUrl() + "/users/grant",
            HttpMethod.POST,
            authed(cashierToken, new GrantPointsRequest(user.getId(), 1000, null)),
            UserPointsAwardResponse.class
        );

        claimReward(userToken, user.getId(), popular.getId());
        claimReward(userToken, user.getId(), popular.getId());
        claimReward(userToken, user.getId(), rare.getId());

        ResponseEntity<List<TopRewardResponse>> response = restTemplate.exchange(
            baseUrl() + "/rewards/top",
            HttpMethod.GET,
            authed(cashierToken),
            new ParameterizedTypeReference<>() {}
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        var ranking = response.getBody();
        assertThat(ranking).extracting(r -> r.id()).containsExactly(popular.getId(), rare.getId());
        assertThat(ranking.get(0).claimCount()).isEqualTo(2);
        assertThat(ranking.get(1).claimCount()).isEqualTo(1);
    }

    /**
     * A fresh organization with one program and storefront. The home-page figures below are
     * org-wide totals and top-10 rankings, which other tests' data in the shared default org
     * would skew.
     */
    private Storefront isolatedStorefront(String name) {
        Organization organization = new Organization();
        organization.setName(name + " Org");
        organization = organizationRepository.save(organization);

        PointProgram program = new PointProgram();
        program.setOrganization(organization);
        program.setName(name + " Points");
        program = pointProgramRepository.save(program);

        Storefront storefront = new Storefront();
        storefront.setOrganization(organization);
        storefront.setName(name + " Storefront");
        storefront.setAddress("1 " + name + " St");
        storefront.setPointProgram(program);
        return storefrontRepository.save(storefront);
    }

    private void grantIn(String cashierToken, PointProgram program, UUID userId, int points) {
        if (!userPointProgramRepository.existsByUser_IdAndPointProgram_Id(userId, program.getId())) {
            joinProgram(userId, program);
        }
        ResponseEntity<UserPointsAwardResponse> response = restTemplate.exchange(
            baseUrl() + "/users/grant",
            HttpMethod.POST,
            authed(cashierToken, new GrantPointsRequest(userId, points, null)),
            UserPointsAwardResponse.class
        );
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    private void cancelWithRefund(String cashierToken, UUID exchangeId) {
        ResponseEntity<Void> response = restTemplate.exchange(
            baseUrl() + "/exchanges/cancel",
            HttpMethod.POST,
            authed(cashierToken, new CancelExchangeRequest(exchangeId, true)),
            Void.class
        );
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    private List<TopClientResponse> topClients(String token) {
        ResponseEntity<List<TopClientResponse>> response = restTemplate.exchange(
            baseUrl() + "/users/top", HttpMethod.GET, authed(token), new ParameterizedTypeReference<>() {}
        );
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody();
    }

    @Test
    void pendingQueueListsOldestFirstWithTheCustomerName() {
        Storefront storefront = isolatedStorefront("Pending Queue");
        PointProgram program = storefront.getPointProgram();
        createEmployee("cashier-queue", "password123", StaffRole.CASHIER, storefront.getOrganization(), storefront);
        String cashierToken = loginEmployee("cashier-queue", "password123", storefront.getOrganization().getId());
        User user = createUser("+5493462008001");
        String userToken = loginUser("+5493462008001");
        Reward first = createRewardIn(program, "Claimed First", 10);
        Reward second = createRewardIn(program, "Claimed Second", 10);

        grantIn(cashierToken, program, user.getId(), 100);
        claimReward(userToken, user.getId(), first.getId());
        claimReward(userToken, user.getId(), second.getId());

        ResponseEntity<List<PendingExchangeReviewResponse>> response = restTemplate.exchange(
            baseUrl() + "/exchanges/pending", HttpMethod.GET, authed(cashierToken), new ParameterizedTypeReference<>() {}
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).extracting(PendingExchangeReviewResponse::rewardTitle).containsExactly("Claimed First", "Claimed Second");
        assertThat(response.getBody()).extracting(PendingExchangeReviewResponse::userName).containsOnly(user.getName());
    }

    @Test
    void homeStatsPointsGrantedExcludeRefundsAndCountCorrectedTotals() {
        Storefront storefront = isolatedStorefront("Home Stats");
        PointProgram program = storefront.getPointProgram();
        createEmployee("cashier-home-stats", "password123", StaffRole.CASHIER, storefront.getOrganization(), storefront);
        String cashierToken = loginEmployee("cashier-home-stats", "password123", storefront.getOrganization().getId());
        User user = createUser("+5493462008002");
        String userToken = loginUser("+5493462008002");
        Reward reward = createRewardIn(program, "Refunded Reward", 30);

        grantIn(cashierToken, program, user.getId(), 100);
        grantIn(cashierToken, program, user.getId(), 50);
        UUID mistakenGrantId = restTemplate.exchange(
            baseUrl() + "/users/grant/history?of=" + user.getId(), HttpMethod.GET, authed(cashierToken),
            new ParameterizedTypeReference<List<PointActionResponse>>() {}
        ).getBody().get(0).id();
        ResponseEntity<PointActionResponse> corrected = restTemplate.exchange(
            baseUrl() + "/users/grant/" + mistakenGrantId, HttpMethod.PATCH,
            authed(cashierToken, new GrantPointsUpdateRequest(20, "error de carga")), PointActionResponse.class
        );
        assertThat(corrected.getStatusCode()).isEqualTo(HttpStatus.OK);
        claimReward(userToken, user.getId(), reward.getId());
        cancelWithRefund(cashierToken, getSolePendingExchange(cashierToken, user.getId()).id());

        ResponseEntity<HomeStatsResponse> response = restTemplate.exchange(
            baseUrl() + "/users/home-stats", HttpMethod.GET, authed(cashierToken), HomeStatsResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        // 100 + (50 corrected to 20); the 30-point refund gives back a redemption, it isn't a grant.
        assertThat(response.getBody().pointsGranted()).isEqualTo(120);
    }

    @Test
    void topClientsCountsGrantedPointsOnlyForActiveCustomersAndKeepsOtherBusinessesStaff() {
        Storefront storefront = isolatedStorefront("Top Clients Filters");
        PointProgram program = storefront.getPointProgram();
        createEmployee("cashier-top-x-own", "password123", StaffRole.CASHIER, storefront.getOrganization(), storefront);
        String cashierToken = loginEmployee("cashier-top-x-own", "password123", storefront.getOrganization().getId());
        User otherBusinessCashier = createEmployee("cashier-top-x-other", "password123", StaffRole.CASHIER);
        User refunded = createUser("+5493462008003");
        String refundedToken = loginUser("+5493462008003");
        User deactivated = createUser("+5493462008004");
        Reward reward = createRewardIn(program, "Top Clients Reward", 30);

        grantIn(cashierToken, program, refunded.getId(), 100);
        grantIn(cashierToken, program, otherBusinessCashier.getId(), 50);
        grantIn(cashierToken, program, deactivated.getId(), 500);
        claimReward(refundedToken, refunded.getId(), reward.getId());
        cancelWithRefund(cashierToken, getSolePendingExchange(cashierToken, refunded.getId()).id());
        deactivated.setActive(false);
        userRepository.save(deactivated);

        List<TopClientResponse> ranking = topClients(cashierToken);

        assertThat(ranking).extracting(TopClientResponse::id).containsExactly(refunded.getId(), otherBusinessCashier.getId());
        assertThat(ranking.get(0).totalPoints()).isEqualTo(100);
    }

    @Test
    void topRewardsLeavesOutDeletedRewards() {
        Storefront storefront = isolatedStorefront("Top Rewards Deleted");
        PointProgram program = storefront.getPointProgram();
        createEmployee("cashier-top-x-deleted", "password123", StaffRole.CASHIER, storefront.getOrganization(), storefront);
        String cashierToken = loginEmployee("cashier-top-x-deleted", "password123", storefront.getOrganization().getId());
        User user = createUser("+5493462008005");
        String userToken = loginUser("+5493462008005");
        Reward kept = createRewardIn(program, "Kept Reward", 10);
        Reward deleted = createRewardIn(program, "Deleted Reward", 10);

        grantIn(cashierToken, program, user.getId(), 100);
        claimReward(userToken, user.getId(), kept.getId());
        claimReward(userToken, user.getId(), deleted.getId());
        claimReward(userToken, user.getId(), deleted.getId());
        deleted.setActive(false);
        rewardRepository.save(deleted);

        ResponseEntity<List<TopRewardResponse>> response = restTemplate.exchange(
            baseUrl() + "/rewards/top", HttpMethod.GET, authed(cashierToken), new ParameterizedTypeReference<>() {}
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).extracting(TopRewardResponse::id).containsExactly(kept.getId());
    }

    /** Moves every transaction of the user {@code days} into the past. */
    private void backdateTransactionsOf(UUID userId, int days) {
        jdbc.update("update point_transactions set created_at = created_at - make_interval(days => ?) where user_id = ?", days, userId);
    }

    private void backdateReward(UUID rewardId, int days) {
        jdbc.update("update rewards set created_at = created_at - make_interval(days => ?) where id = ?", days, rewardId);
    }

    private ResponseEntity<PendingExchangeQueueResponse> pendingQueue(String token, int limit) {
        return restTemplate.exchange(
            baseUrl() + "/exchanges/pending-queue?limit=" + limit, HttpMethod.GET, authed(token), PendingExchangeQueueResponse.class
        );
    }

    private ResponseEntity<String> approveWithCode(String token, UUID exchangeId, String code) {
        return restTemplate.exchange(
            baseUrl() + "/exchanges/approve-with-code", HttpMethod.POST,
            authed(token, new ApproveExchangeWithCodeRequest(exchangeId, code)), String.class
        );
    }

    private List<PendingExchangeResponse> pendingOf(String token, UUID userId) {
        return restTemplate.exchange(
            baseUrl() + "/exchanges/pending/" + userId, HttpMethod.GET, authed(token),
            new ParameterizedTypeReference<List<PendingExchangeResponse>>() {}
        ).getBody();
    }

    @Test
    void pendingQueueReturnsTheOldestRowsAndTheSizeOfTheWholeQueue() {
        Storefront storefront = isolatedStorefront("Bounded Queue");
        PointProgram program = storefront.getPointProgram();
        createEmployee("cashier-bounded-queue", "password123", StaffRole.CASHIER, storefront.getOrganization(), storefront);
        String cashierToken = loginEmployee("cashier-bounded-queue", "password123", storefront.getOrganization().getId());
        User user = createUser("+5493462008006");
        String userToken = loginUser("+5493462008006");
        grantIn(cashierToken, program, user.getId(), 100);
        for (String title : List.of("Queue A", "Queue B", "Queue C")) {
            claimReward(userToken, user.getId(), createRewardIn(program, title, 10).getId());
        }
        // Another business's pending redemption must not show up or count.
        createEmployee("cashier-bounded-queue-other", "password123", StaffRole.CASHIER);
        String otherCashierToken = loginEmployee("cashier-bounded-queue-other", "password123");
        User outsider = createUser("+5493462008007");
        grant(otherCashierToken, outsider.getId(), 50);
        claimReward(loginUser("+5493462008007"), outsider.getId(), createReward("Outside Queue Reward", 10).getId());

        ResponseEntity<PendingExchangeQueueResponse> response = pendingQueue(cashierToken, 2);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        PendingExchangeQueueResponse queue = response.getBody();
        assertThat(queue.total()).isEqualTo(3);
        assertThat(queue.items()).extracting(PendingExchangeReviewResponse::rewardTitle).containsExactly("Queue A", "Queue B");
        assertThat(queue.items()).extracting(PendingExchangeReviewResponse::userName).containsOnly(user.getName());
        assertThat(queue.items().get(0).createdAt()).isNotNull().isBeforeOrEqualTo(queue.items().get(1).createdAt());
        for (int outOfRange : new int[] {0, 101}) {
            ResponseEntity<String> rejected = restTemplate.exchange(
                baseUrl() + "/exchanges/pending-queue?limit=" + outOfRange, HttpMethod.GET, authed(cashierToken), String.class
            );
            assertThat(rejected.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        }
    }

    @Test
    void approveWithCodeDeliversOnlyTheRedemptionTheCodeBelongsTo() {
        Storefront storefront = isolatedStorefront("Approve With Code");
        PointProgram program = storefront.getPointProgram();
        createEmployee("cashier-approve-code", "password123", StaffRole.CASHIER, storefront.getOrganization(), storefront);
        String cashierToken = loginEmployee("cashier-approve-code", "password123", storefront.getOrganization().getId());
        User user = createUser("+5493462008008");
        String userToken = loginUser("+5493462008008");
        grantIn(cashierToken, program, user.getId(), 100);
        claimReward(userToken, user.getId(), createRewardIn(program, "Code First", 10).getId());
        claimReward(userToken, user.getId(), createRewardIn(program, "Code Second", 10).getId());
        List<PendingExchangeResponse> pending = pendingOf(cashierToken, user.getId());
        PendingExchangeResponse first = pending.stream().filter(p -> p.rewardTitle().equals("Code First")).findFirst().orElseThrow();
        PendingExchangeResponse second = pending.stream().filter(p -> p.rewardTitle().equals("Code Second")).findFirst().orElseThrow();

        // A real code, but of the customer's other redemption.
        assertThat(approveWithCode(cashierToken, first.id(), second.exchangeCode()).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(approveWithCode(cashierToken, first.id(), "x").getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(pendingQueue(cashierToken, 6).getBody().total()).isEqualTo(2);

        // Codes are matched case-insensitively, as on the validation page.
        assertThat(approveWithCode(cashierToken, first.id(), first.exchangeCode().toUpperCase()).getStatusCode()).isEqualTo(HttpStatus.OK);

        assertThat(pendingQueue(cashierToken, 6).getBody().items()).extracting(PendingExchangeReviewResponse::id).containsExactly(second.id());
        assertThat(approveWithCode(cashierToken, first.id(), first.exchangeCode()).getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        createEmployee("cashier-approve-code-other", "password123", StaffRole.CASHIER);
        String otherCashierToken = loginEmployee("cashier-approve-code-other", "password123");
        assertThat(approveWithCode(otherCashierToken, second.id(), second.exchangeCode()).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    /**
     * The home page reports on the last 30 days. Data from 45 days ago lands in the comparison
     * window, data from 70 days ago in neither, and pending redemptions count at any age.
     */
    @Test
    void dashboardFiguresCoverOnlyTheLast30Days() {
        Storefront storefront = isolatedStorefront("Last 30 Days");
        PointProgram program = storefront.getPointProgram();
        createEmployee("cashier-last-30", "password123", StaffRole.CASHIER, storefront.getOrganization(), storefront);
        String cashierToken = loginEmployee("cashier-last-30", "password123", storefront.getOrganization().getId());
        User previous = createUser("+5493462008009");
        User current = createUser("+5493462008010");
        User ancient = createUser("+5493462008011");
        Reward claimedLongAgo = createRewardIn(program, "Claimed 45 Days Ago", 10);
        Reward claimedToday = createRewardIn(program, "Claimed Today", 10);
        Reward neverClaimed = createRewardIn(program, "Never Claimed", 10);
        createRewardIn(program, "Added Today", 10);
        backdateReward(claimedLongAgo.getId(), 91);
        backdateReward(claimedToday.getId(), 90);
        backdateReward(neverClaimed.getId(), 90);

        grantIn(cashierToken, program, previous.getId(), 100);
        claimReward(loginUser("+5493462008009"), previous.getId(), claimedLongAgo.getId());
        backdateTransactionsOf(previous.getId(), 45);
        // Corrected today, but the lot was granted 45 days ago: the correction belongs to that window.
        UUID oldLotId = restTemplate.exchange(
            baseUrl() + "/users/grant/history?of=" + previous.getId(), HttpMethod.GET, authed(cashierToken),
            new ParameterizedTypeReference<List<PointActionResponse>>() {}
        ).getBody().get(0).id();
        assertThat(restTemplate.exchange(
            baseUrl() + "/users/grant/" + oldLotId, HttpMethod.PATCH,
            authed(cashierToken, new GrantPointsUpdateRequest(60, "error de carga")), PointActionResponse.class
        ).getStatusCode()).isEqualTo(HttpStatus.OK);
        grantIn(cashierToken, program, current.getId(), 40);
        claimReward(loginUser("+5493462008010"), current.getId(), claimedToday.getId());
        grantIn(cashierToken, program, ancient.getId(), 7);
        backdateTransactionsOf(ancient.getId(), 70);

        HomeStatsResponse stats = restTemplate.exchange(
            baseUrl() + "/users/home-stats", HttpMethod.GET, authed(cashierToken), HomeStatsResponse.class
        ).getBody();
        assertThat(stats).isEqualTo(new HomeStatsResponse(program.getId(), "Last 30 Days Points", 30, 1, 1, 1, 1, 40, 60, 2));

        List<TopRewardResponse> topRewards = restTemplate.exchange(
            baseUrl() + "/rewards/top", HttpMethod.GET, authed(cashierToken), new ParameterizedTypeReference<List<TopRewardResponse>>() {}
        ).getBody();
        assertThat(topRewards).extracting(TopRewardResponse::id).containsExactly(claimedToday.getId());

        List<TopClientResponse> topClients = topClients(cashierToken);
        assertThat(topClients).extracting(TopClientResponse::id).containsExactly(current.getId());
        assertThat(topClients.get(0).totalPoints()).isEqualTo(40);

        // "Added Today" hasn't been in the catalog for the whole window, so it isn't flagged.
        List<UnclaimedRewardResponse> unclaimed = restTemplate.exchange(
            baseUrl() + "/rewards/unclaimed", HttpMethod.GET, authed(cashierToken), new ParameterizedTypeReference<List<UnclaimedRewardResponse>>() {}
        ).getBody();
        assertThat(unclaimed).extracting(UnclaimedRewardResponse::id).containsExactly(claimedLongAgo.getId(), neverClaimed.getId());
    }

    @Test
    void topRewardsShowsAtMostSix() {
        Storefront storefront = isolatedStorefront("Top Six");
        PointProgram program = storefront.getPointProgram();
        createEmployee("cashier-top-six", "password123", StaffRole.CASHIER, storefront.getOrganization(), storefront);
        String cashierToken = loginEmployee("cashier-top-six", "password123", storefront.getOrganization().getId());
        User user = createUser("+5493462008012");
        String userToken = loginUser("+5493462008012");
        grantIn(cashierToken, program, user.getId(), 100);
        IntStream.rangeClosed(1, 7).forEach(i -> claimReward(userToken, user.getId(), createRewardIn(program, "Six " + i, 1).getId()));

        List<TopRewardResponse> topRewards = restTemplate.exchange(
            baseUrl() + "/rewards/top", HttpMethod.GET, authed(cashierToken), new ParameterizedTypeReference<List<TopRewardResponse>>() {}
        ).getBody();

        assertThat(topRewards).hasSize(6);
    }

    private HomeStatsResponse homeStats(String token) {
        return restTemplate.exchange(baseUrl() + "/users/home-stats", HttpMethod.GET, authed(token), HomeStatsResponse.class).getBody();
    }

    private int pendingCount(String token) {
        return restTemplate.exchange(baseUrl() + "/exchanges/pending-count", HttpMethod.GET, authed(token), Integer.class).getBody();
    }

    private List<TopRewardResponse> topRewards(String token) {
        return restTemplate.exchange(
            baseUrl() + "/rewards/top", HttpMethod.GET, authed(token), new ParameterizedTypeReference<List<TopRewardResponse>>() {}
        ).getBody();
    }

    /**
     * One organization, two storefronts on different programs and one with no program: each
     * cashier's home shows only their selected storefront's program.
     */
    @Test
    void dashboardHomeShowsOnlyTheSelectedStorefrontsProgram() {
        Storefront centro = isolatedStorefront("Scope Centro");
        Organization organization = centro.getOrganization();
        PointProgram centroProgram = centro.getPointProgram();
        PointProgram norteProgram = new PointProgram();
        norteProgram.setOrganization(organization);
        norteProgram.setName("Scope Norte Points");
        norteProgram = pointProgramRepository.save(norteProgram);
        Storefront norte = new Storefront();
        norte.setOrganization(organization);
        norte.setName("Scope Norte Storefront");
        norte.setAddress("2 Scope Norte St");
        norte.setPointProgram(norteProgram);
        norte = storefrontRepository.save(norte);
        Storefront withoutProgram = new Storefront();
        withoutProgram.setOrganization(organization);
        withoutProgram.setName("Scope Sin Programa Storefront");
        withoutProgram.setAddress("3 Scope St");
        withoutProgram = storefrontRepository.save(withoutProgram);

        createEmployee("cashier-scope-centro", "password123", StaffRole.CASHIER, organization, centro);
        createEmployee("cashier-scope-norte", "password123", StaffRole.CASHIER, organization, norte);
        createEmployee("cashier-scope-none", "password123", StaffRole.CASHIER, organization, withoutProgram);
        String centroToken = loginEmployee("cashier-scope-centro", "password123", organization.getId());
        String norteToken = loginEmployee("cashier-scope-norte", "password123", organization.getId());
        String noProgramToken = loginEmployee("cashier-scope-none", "password123", organization.getId());

        User customer = createUser("+5493462008013");
        String customerToken = loginUser("+5493462008013");
        Reward centroReward = createRewardIn(centroProgram, "Scope Centro Reward", 10);
        Reward norteReward = createRewardIn(norteProgram, "Scope Norte Reward", 10);
        grantIn(centroToken, centroProgram, customer.getId(), 100);
        grantIn(norteToken, norteProgram, customer.getId(), 40);
        claimReward(customerToken, customer.getId(), centroReward.getId());
        claimReward(customerToken, customer.getId(), norteReward.getId());

        assertThat(homeStats(centroToken)).isEqualTo(new HomeStatsResponse(centroProgram.getId(), "Scope Centro Points", 30, 1, 0, 1, 0, 100, 0, 1));
        assertThat(homeStats(norteToken)).isEqualTo(new HomeStatsResponse(norteProgram.getId(), "Scope Norte Points", 30, 1, 0, 1, 0, 40, 0, 1));
        PendingExchangeQueueResponse centroQueue = pendingQueue(centroToken, 6).getBody();
        assertThat(centroQueue.total()).isEqualTo(1);
        assertThat(centroQueue.items()).extracting(PendingExchangeReviewResponse::rewardTitle).containsExactly("Scope Centro Reward");
        assertThat(pendingCount(centroToken)).isEqualTo(1);
        assertThat(topRewards(centroToken)).extracting(TopRewardResponse::id).containsExactly(centroReward.getId());
        assertThat(topRewards(norteToken)).extracting(TopRewardResponse::id).containsExactly(norteReward.getId());
        assertThat(topClients(centroToken)).extracting(TopClientResponse::totalPoints).containsExactly(100);
        assertThat(topClients(norteToken)).extracting(TopClientResponse::totalPoints).containsExactly(40);

        assertThat(homeStats(noProgramToken)).isEqualTo(HomeStatsResponse.withoutProgram(30));
        assertThat(pendingQueue(noProgramToken, 6).getBody().total()).isZero();
        assertThat(pendingCount(noProgramToken)).isZero();
        assertThat(topRewards(noProgramToken)).isEmpty();
        assertThat(topClients(noProgramToken)).isEmpty();
    }

    private Reward createRewardIn(PointProgram program, String title, int costPoints) {
        Reward reward = new Reward();
        reward.setPointProgram(program);
        reward.setTitle(title);
        reward.setCostPoints(costPoints);
        return rewardRepository.save(reward);
    }

    /**
     * Regression test for a double-spend race: claimReward's balance check and the
     * redeem insert used to be a plain read-then-write with no lock, so concurrent
     * claims against the same balance could all pass the check before any of them
     * committed. UserService#lockBalance (a pg_advisory_xact_lock per user+program)
     * serializes them -- this fires N concurrent claims at a balance that can only
     * ever afford one, and asserts exactly one succeeds and the balance never goes negative.
     *
     * Uses its own organization/program/storefront rather than the shared defaults --
     * /rewards/top is a top-10-for-the-org ranking, and dumping another claimed reward
     * into the shared default org would make other tests asserting on that ranking flaky.
     */
    @Test
    void concurrentClaimsAgainstABalanceThatCanOnlyAffordOneAllSerializeCorrectly() throws InterruptedException {
        Organization organization = new Organization();
        organization.setName("Race Test Org");
        organization = organizationRepository.save(organization);

        PointProgram program = new PointProgram();
        program.setOrganization(organization);
        program.setName("Race Test Points");
        program = pointProgramRepository.save(program);

        Storefront storefront = new Storefront();
        storefront.setOrganization(organization);
        storefront.setName("Race Test Storefront");
        storefront.setAddress("1 Race St");
        storefront.setPointProgram(program);
        storefront = storefrontRepository.save(storefront);

        User cashier = createEmployee("cashier-race", "password123", StaffRole.CASHIER, organization, storefront);
        String cashierToken = loginEmployee("cashier-race", "password123", organization.getId());
        User user = createUser("+5493462009001");
        String userToken = loginUser("+5493462009001");

        Reward rewardToSave = new Reward();
        rewardToSave.setPointProgram(program);
        rewardToSave.setTitle("Race Reward");
        rewardToSave.setCostPoints(100);
        final Reward reward = rewardRepository.save(rewardToSave);

        joinProgram(user.getId(), program);
        restTemplate.exchange(
            baseUrl() + "/users/grant",
            HttpMethod.POST,
            authed(cashierToken, new GrantPointsRequest(user.getId(), 100, null)),
            UserPointsAwardResponse.class
        );

        int attempts = 15;
        ExecutorService pool = Executors.newFixedThreadPool(attempts);
        AtomicInteger succeeded = new AtomicInteger(0);
        try {
            List<Runnable> tasks = IntStream.range(0, attempts)
                .<Runnable>mapToObj(i -> () -> {
                    ResponseEntity<String> response = restTemplate.exchange(
                        baseUrl() + "/users/claim-reward",
                        HttpMethod.POST,
                        authed(userToken, new ClaimRewardRequest(user.getId(), reward.getId())),
                        String.class
                    );
                    if (response.getStatusCode() == HttpStatus.OK) {
                        succeeded.incrementAndGet();
                    }
                })
                .toList();
            tasks.forEach(pool::submit);
        } finally {
            pool.shutdown();
            assertThat(pool.awaitTermination(30, TimeUnit.SECONDS)).isTrue();
        }

        assertThat(succeeded.get()).isEqualTo(1);
        UserPointsResponse balance = restTemplate
            .exchange(
                baseUrl() + "/users/" + user.getId() + "?programId=" + program.getId(),
                HttpMethod.GET,
                authed(cashierToken),
                UserPointsResponse.class
            )
            .getBody();
        assertThat(balance.points()).isEqualTo(0);
    }
}
