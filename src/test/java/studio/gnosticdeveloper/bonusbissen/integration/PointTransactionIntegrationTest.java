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
import studio.gnosticdeveloper.bonusbissen.dto.request.GrantPointsUpdateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.PointActionResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.MovementResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.PagedResponse;
import studio.gnosticdeveloper.bonusbissen.dto.request.JoinPointProgramRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.UserPointsAwardResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.UserPointsResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.ExchangeResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.PendingExchangeResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.TopClientResponse;
import studio.gnosticdeveloper.bonusbissen.entity.User;
import studio.gnosticdeveloper.bonusbissen.entity.StaffRole;
import studio.gnosticdeveloper.bonusbissen.entity.Reward;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

class PointTransactionIntegrationTest extends AbstractIntegrationTest {

    private UserPointsResponse getBalance(String token, UUID userId) {
        return restTemplate
            .exchange(baseUrl() + "/users/" + userId + "?programId=" + defaultProgram().getId(), HttpMethod.GET, authed(token), UserPointsResponse.class)
            .getBody();
    }

    private UUID grant(String cashierToken, UUID userId, int points) {
        restTemplate.exchange(
            baseUrl() + "/point-programs/" + defaultProgram().getId() + "/members",
            HttpMethod.POST,
            authed(cashierToken, new JoinPointProgramRequest(userId)),
            Void.class
        );
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
        assertThat(movements.stream().filter(MovementResponse::correction).findFirst().orElseThrow().correctedTransactionId()).isEqualTo(originalId);

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
            authed(userToken, new studio.gnosticdeveloper.bonusbissen.dto.request.UserCancelExchangeRequest(exchangeId)),
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

    @Test
    void topRewardsRanksByClaimCountDescending() {
        User cashier = createEmployee("cashier-top-rewards", "password123", StaffRole.CASHIER);
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
        studio.gnosticdeveloper.bonusbissen.entity.Organization organization = new studio.gnosticdeveloper.bonusbissen.entity.Organization();
        organization.setName("Race Test Org");
        organization = organizationRepository.save(organization);

        studio.gnosticdeveloper.bonusbissen.entity.PointProgram program = new studio.gnosticdeveloper.bonusbissen.entity.PointProgram();
        program.setOrganization(organization);
        program.setName("Race Test Points");
        program = pointProgramRepository.save(program);

        studio.gnosticdeveloper.bonusbissen.entity.Storefront storefront = new studio.gnosticdeveloper.bonusbissen.entity.Storefront();
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

        restTemplate.exchange(
            baseUrl() + "/point-programs/" + program.getId() + "/members",
            HttpMethod.POST,
            authed(cashierToken, new JoinPointProgramRequest(user.getId())),
            Void.class
        );
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
            List<Runnable> tasks = java.util.stream.IntStream.range(0, attempts)
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
