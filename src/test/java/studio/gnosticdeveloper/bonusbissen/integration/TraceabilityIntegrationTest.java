package studio.gnosticdeveloper.bonusbissen.integration;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import studio.gnosticdeveloper.bonusbissen.dto.request.ApproveExchangeRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.CancelExchangeRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.ClaimRewardRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.ExchangeVerifyRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.GrantPointsRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.JoinPointProgramRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.StaffCreateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.UserCancelExchangeRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.UserRegisterRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.ClaimRewardResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.PendingExchangeResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.StaffResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.UserPointsAwardResponse;
import studio.gnosticdeveloper.bonusbissen.entity.OperationType;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.entity.PointProgram;
import studio.gnosticdeveloper.bonusbissen.entity.Reward;
import studio.gnosticdeveloper.bonusbissen.entity.StaffRole;
import studio.gnosticdeveloper.bonusbissen.entity.Storefront;
import studio.gnosticdeveloper.bonusbissen.entity.TraceabilityLog;
import studio.gnosticdeveloper.bonusbissen.entity.User;
import studio.gnosticdeveloper.bonusbissen.exception.BadRequestException;
import studio.gnosticdeveloper.bonusbissen.repository.TraceabilityLogRepository;
import studio.gnosticdeveloper.bonusbissen.service.TraceabilityRetentionService;
import studio.gnosticdeveloper.bonusbissen.service.TraceabilityService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TraceabilityIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TraceabilityService traceabilityService;
    @Autowired
    private TraceabilityRetentionService traceabilityRetentionService;
    @Autowired
    private TraceabilityLogRepository traceabilityLogRepository;

    private List<TraceabilityLog> logsFor(UUID affectedUserId) {
        return traceabilityService.find(null, null, affectedUserId);
    }

    private List<TraceabilityLog> logsFor(UUID affectedUserId, OperationType type) {
        return logsFor(affectedUserId).stream().filter(l -> l.getOperationType() == type).toList();
    }

    @Test
    void revokingAStaffMembersSessionsRecordsALog() {
        createEmployee("trace-admin", TEST_USER_PASSWORD, StaffRole.ADMIN);
        String adminToken = loginEmployee("trace-admin", TEST_USER_PASSWORD);
        User target = createEmployee("trace-target", TEST_USER_PASSWORD, StaffRole.CASHIER);
        UUID targetStaffId = organizationStaffRepository.findByUserIdAndActiveTrue(target.getId()).orElseThrow().getId();

        ResponseEntity<Void> response = restTemplate.exchange(
            baseUrl() + "/staff/" + targetStaffId + "/sessions/revoke",
            HttpMethod.POST,
            authed(adminToken),
            Void.class
        );
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        List<TraceabilityLog> logs = logsFor(target.getId());
        assertThat(logs).hasSize(1);
        assertThat(logs.get(0).getOperationType()).isEqualTo(OperationType.SESSION_REVOKE);
        assertThat(logs.get(0).getAffectedUserIds()).containsExactly(target.getId());
    }

    @Test
    void promotingAUserToStaffRecordsALog() {
        createEmployee("trace-admin-2", TEST_USER_PASSWORD, StaffRole.ADMIN);
        String adminToken = loginEmployee("trace-admin-2", TEST_USER_PASSWORD);
        User customer = createUser("trace-promote-me");

        ResponseEntity<StaffResponse> response = restTemplate.exchange(
            baseUrl() + "/staff",
            HttpMethod.POST,
            authed(adminToken, new StaffCreateRequest(customer.getId(), StaffRole.CASHIER, null)),
            StaffResponse.class
        );
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        List<TraceabilityLog> logs = logsFor(customer.getId());
        assertThat(logs).hasSize(1);
        assertThat(logs.get(0).getOperationType()).isEqualTo(OperationType.STAFF_CREATE);
    }

    @Test
    void grantingPointsRecordsALog() {
        User cashier = createEmployee("trace-cashier", TEST_USER_PASSWORD, StaffRole.CASHIER);
        String cashierToken = loginEmployee("trace-cashier", TEST_USER_PASSWORD);
        User user = createUser("trace-grant-me");

        restTemplate.exchange(
            baseUrl() + "/point-programs/" + defaultProgram().getId() + "/members",
            HttpMethod.POST,
            authed(cashierToken, new JoinPointProgramRequest(user.getId())),
            Void.class
        );
        ResponseEntity<UserPointsAwardResponse> response = restTemplate.exchange(
            baseUrl() + "/users/grant",
            HttpMethod.POST,
            authed(cashierToken, new GrantPointsRequest(user.getId(), 25, null)),
            UserPointsAwardResponse.class
        );
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);

        List<TraceabilityLog> logs = logsFor(user.getId());
        assertThat(logs).hasSize(1);
        assertThat(logs.get(0).getOperationType()).isEqualTo(OperationType.POINTS_GRANT);
        assertThat(logs.get(0).getOriginatingUser().getId()).isEqualTo(cashier.getId());
        assertThat(logs.get(0).getPayload()).containsEntry("points", 25);
    }

    @Test
    void signingUpRecordsALogWhereOriginatingAndAffectedAreTheSameUser() {
        ResponseEntity<Void> response = restTemplate.exchange(
            baseUrl() + "/auth/user-register",
            HttpMethod.POST,
            new org.springframework.http.HttpEntity<>(
                new UserRegisterRequest("trace-signup-user", "Str0ng!Pass", "Trace Signup", null)
            ),
            Void.class
        );
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        User user = userRepository.findByUsername("trace-signup-user").orElseThrow();

        List<TraceabilityLog> logs = logsFor(user.getId());
        assertThat(logs).hasSize(1);
        assertThat(logs.get(0).getOperationType()).isEqualTo(OperationType.USER_CREATE);
        assertThat(logs.get(0).getOriginatingUser().getId()).isEqualTo(user.getId());
    }

    @Test
    void bulkRecordSharesOneOperationIdAcrossAllAffectedUsers() {
        User originator = createUser("trace-bulk-originator");
        User affectedOne = createUser("trace-bulk-affected-1");
        User affectedTwo = createUser("trace-bulk-affected-2");

        UUID operationId = traceabilityService.record(
            OperationType.POINTS_GRANT,
            originator.getId(),
            Set.of(affectedOne.getId(), affectedTwo.getId()),
            Map.of()
        );

        TraceabilityLog log = traceabilityLogRepository.findById(operationId).orElseThrow();
        assertThat(log.getAffectedUserIds()).containsExactlyInAnyOrder(affectedOne.getId(), affectedTwo.getId());
    }

    @Test
    void eachSingleUserRecordCallGetsAFreshOperationId() {
        User originator = createUser("trace-fresh-originator");
        User affected = createUser("trace-fresh-affected");

        UUID first = traceabilityService.record(OperationType.POINTS_GRANT, originator.getId(), affected.getId(), Map.of());
        UUID second = traceabilityService.record(OperationType.POINTS_GRANT, originator.getId(), affected.getId(), Map.of());

        assertThat(first).isNotEqualTo(second);
    }

    @Test
    void findWithNoFiltersThrowsBadRequest() {
        assertThatThrownBy(() -> traceabilityService.find(null, null, null)).isInstanceOf(BadRequestException.class);
    }

    @Test
    void purgeExpiredRemovesOnlyOldNonExemptLogsAndTheirAffectedUserRows() {
        User originator = createUser("trace-purge-originator");
        User affected = createUser("trace-purge-affected");
        OffsetDateTime old = OffsetDateTime.now().minusMonths(7);

        UUID oldPurgeable = saveBackdated(OperationType.SESSION_REVOKE, originator, affected, old);
        UUID oldExemptStaff = saveBackdated(OperationType.STAFF_CREATE, originator, affected, old);
        UUID oldExemptGrant = saveBackdated(OperationType.POINTS_GRANT, originator, affected, old);
        UUID recentPurgeable = saveBackdated(OperationType.SESSION_REVOKE, originator, affected, OffsetDateTime.now());

        int purged = traceabilityRetentionService.purgeExpired();

        assertThat(purged).isEqualTo(1);
        assertThat(traceabilityLogRepository.findById(oldPurgeable)).isEmpty();
        assertThat(traceabilityLogRepository.findById(oldExemptStaff)).isPresent();
        assertThat(traceabilityLogRepository.findById(oldExemptGrant)).isPresent();
        assertThat(traceabilityLogRepository.findById(recentPurgeable)).isPresent();
    }

    /**
     * Regression test for a self-invocation gap: runScheduledPurge() (not itself
     * @Transactional at first) called purgeExpired() via a plain `this` call, which
     * Spring's proxy-based AOP can't intercept -- purgeExpired()'s own @Transactional
     * had no effect on that path. Exercises the actual @Scheduled entry point (called
     * externally here, same as the scheduler would) rather than purgeExpired() directly.
     */
    @Test
    void scheduledPurgeEntryPointPurgesCorrectlyToo() {
        User originator = createUser("trace-scheduled-purge-originator");
        User affected = createUser("trace-scheduled-purge-affected");
        OffsetDateTime old = OffsetDateTime.now().minusMonths(7);

        UUID oldPurgeable = saveBackdated(OperationType.SESSION_REVOKE, originator, affected, old);
        UUID oldExemptGrant = saveBackdated(OperationType.POINTS_GRANT, originator, affected, old);

        traceabilityRetentionService.runScheduledPurge();

        assertThat(traceabilityLogRepository.findById(oldPurgeable)).isEmpty();
        assertThat(traceabilityLogRepository.findById(oldExemptGrant)).isPresent();
    }

    private UUID saveBackdated(OperationType type, User originator, User affected, OffsetDateTime createdAt) {
        TraceabilityLog entity = new TraceabilityLog();
        entity.setOperationType(type);
        entity.setOriginatingUser(originator);
        entity.setAffectedUserIds(Set.of(affected.getId()));
        entity.setCreatedAt(createdAt);
        return traceabilityLogRepository.save(entity).getOperationId();
    }

    /** Joins the default program, grants enough points, and claims {@code reward}; returns the pending transaction id. */
    private UUID claimPendingExchange(String cashierToken, String userToken, User user, Reward reward) {
        restTemplate.exchange(
            baseUrl() + "/point-programs/" + defaultProgram().getId() + "/members",
            HttpMethod.POST,
            authed(cashierToken, new JoinPointProgramRequest(user.getId())),
            Void.class
        );
        restTemplate.exchange(
            baseUrl() + "/users/grant",
            HttpMethod.POST,
            authed(cashierToken, new GrantPointsRequest(user.getId(), reward.getCostPoints(), null)),
            UserPointsAwardResponse.class
        );
        ResponseEntity<ClaimRewardResponse> claim = restTemplate.exchange(
            baseUrl() + "/users/claim-reward",
            HttpMethod.POST,
            authed(userToken, new ClaimRewardRequest(user.getId(), reward.getId())),
            ClaimRewardResponse.class
        );
        assertThat(claim.getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<List<PendingExchangeResponse>> pending = restTemplate.exchange(
            baseUrl() + "/exchanges/pending/" + user.getId(),
            HttpMethod.GET,
            authed(cashierToken),
            new ParameterizedTypeReference<>() {}
        );
        return pending.getBody().get(0).id();
    }

    @Test
    void claimingARewardRecordsALog() {
        User cashier = createEmployee("trace-cashier-claim", TEST_USER_PASSWORD, StaffRole.CASHIER);
        String cashierToken = loginEmployee("trace-cashier-claim", TEST_USER_PASSWORD);
        User user = createUser("trace-claim-me");
        String userToken = loginUser("trace-claim-me");
        Reward reward = createReward("Trace Reward", 10);

        claimPendingExchange(cashierToken, userToken, user, reward);

        List<TraceabilityLog> claimLogs = logsFor(user.getId(), OperationType.REWARD_CLAIM);
        assertThat(claimLogs).hasSize(1);
        assertThat(claimLogs.get(0).getOriginatingUser().getId()).isEqualTo(user.getId());
        assertThat(claimLogs.get(0).getPayload()).containsEntry("costPoints", 10);
    }

    @Test
    void verifyingAnExchangeRecordsALog() {
        User cashier = createEmployee("trace-cashier-verify", TEST_USER_PASSWORD, StaffRole.CASHIER);
        String cashierToken = loginEmployee("trace-cashier-verify", TEST_USER_PASSWORD);
        User user = createUser("trace-verify-me");
        String userToken = loginUser("trace-verify-me");
        Reward reward = createReward("Trace Verify Reward", 10);
        claimPendingExchange(cashierToken, userToken, user, reward);

        ResponseEntity<List<PendingExchangeResponse>> pending = restTemplate.exchange(
            baseUrl() + "/exchanges/pending/" + user.getId(),
            HttpMethod.GET,
            authed(cashierToken),
            new ParameterizedTypeReference<>() {}
        );
        String code = pending.getBody().get(0).exchangeCode();

        restTemplate.exchange(
            baseUrl() + "/exchanges/verify",
            HttpMethod.POST,
            authed(cashierToken, new ExchangeVerifyRequest(code)),
            Void.class
        );

        List<TraceabilityLog> verifyLogs = logsFor(user.getId(), OperationType.EXCHANGE_VERIFY);
        assertThat(verifyLogs).hasSize(1);
        assertThat(verifyLogs.get(0).getOriginatingUser().getId()).isEqualTo(cashier.getId());
    }

    @Test
    void approvingAnExchangeRecordsALog() {
        User cashier = createEmployee("trace-cashier-approve", TEST_USER_PASSWORD, StaffRole.CASHIER);
        String cashierToken = loginEmployee("trace-cashier-approve", TEST_USER_PASSWORD);
        User user = createUser("trace-approve-me");
        String userToken = loginUser("trace-approve-me");
        Reward reward = createReward("Trace Approve Reward", 10);
        UUID transactionId = claimPendingExchange(cashierToken, userToken, user, reward);

        restTemplate.exchange(
            baseUrl() + "/exchanges/approve",
            HttpMethod.POST,
            authed(cashierToken, new ApproveExchangeRequest(transactionId)),
            Void.class
        );

        List<TraceabilityLog> approveLogs = logsFor(user.getId(), OperationType.EXCHANGE_APPROVE);
        assertThat(approveLogs).hasSize(1);
        assertThat(approveLogs.get(0).getOriginatingUser().getId()).isEqualTo(cashier.getId());
        assertThat(approveLogs.get(0).getPayload()).containsEntry("points", 10);
    }

    @Test
    void cancellingAnExchangeWithRefundRecordsALog() {
        User cashier = createEmployee("trace-cashier-cancel", TEST_USER_PASSWORD, StaffRole.CASHIER);
        String cashierToken = loginEmployee("trace-cashier-cancel", TEST_USER_PASSWORD);
        User user = createUser("trace-cancel-me");
        String userToken = loginUser("trace-cancel-me");
        Reward reward = createReward("Trace Cancel Reward", 10);
        UUID transactionId = claimPendingExchange(cashierToken, userToken, user, reward);

        restTemplate.exchange(
            baseUrl() + "/exchanges/cancel",
            HttpMethod.POST,
            authed(cashierToken, new CancelExchangeRequest(transactionId, true)),
            Void.class
        );

        List<TraceabilityLog> cancelLogs = logsFor(user.getId(), OperationType.EXCHANGE_CANCEL);
        assertThat(cancelLogs).hasSize(1);
        assertThat(cancelLogs.get(0).getOriginatingUser().getId()).isEqualTo(cashier.getId());
        assertThat(cancelLogs.get(0).getPayload()).containsEntry("refunded", true);
    }

    @Test
    void userCancellingAnExchangeRecordsALog() {
        User cashier = createEmployee("trace-cashier-ucancel", TEST_USER_PASSWORD, StaffRole.CASHIER);
        String cashierToken = loginEmployee("trace-cashier-ucancel", TEST_USER_PASSWORD);
        User user = createUser("trace-ucancel-me");
        String userToken = loginUser("trace-ucancel-me");
        Reward reward = createReward("Trace User Cancel Reward", 10);
        UUID transactionId = claimPendingExchange(cashierToken, userToken, user, reward);

        restTemplate.exchange(
            baseUrl() + "/exchanges/user-cancel",
            HttpMethod.POST,
            authed(userToken, new UserCancelExchangeRequest(transactionId)),
            Void.class
        );

        List<TraceabilityLog> cancelLogs = logsFor(user.getId(), OperationType.EXCHANGE_USER_CANCEL);
        assertThat(cancelLogs).hasSize(1);
        assertThat(cancelLogs.get(0).getOriginatingUser().getId()).isEqualTo(user.getId());
    }

    @Test
    void traceabilityEndpointReturnsTypedDetailsForTheCallersOrganization() {
        User cashier = createEmployee("trace-api-cashier", TEST_USER_PASSWORD, StaffRole.CASHIER);
        String cashierToken = loginEmployee("trace-api-cashier", TEST_USER_PASSWORD);
        String adminToken = adminToken("trace-api-admin");
        User user = createUser("trace-api-grant-me");

        restTemplate.exchange(
            baseUrl() + "/point-programs/" + defaultProgram().getId() + "/members",
            HttpMethod.POST,
            authed(cashierToken, new JoinPointProgramRequest(user.getId())),
            Void.class
        );
        restTemplate.exchange(
            baseUrl() + "/users/grant",
            HttpMethod.POST,
            authed(cashierToken, new GrantPointsRequest(user.getId(), 25, null)),
            UserPointsAwardResponse.class
        );

        ResponseEntity<List<Map<String, Object>>> response = restTemplate.exchange(
            baseUrl() + "/traceability?affectedUserId=" + user.getId(),
            HttpMethod.GET,
            authed(adminToken),
            new ParameterizedTypeReference<>() {}
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
        Map<String, Object> row = response.getBody().get(0);
        assertThat(row.get("operationType")).isEqualTo("POINTS_GRANT");
        @SuppressWarnings("unchecked")
        Map<String, Object> originatingUser = (Map<String, Object>) row.get("originatingUser");
        assertThat(originatingUser.get("id")).isEqualTo(cashier.getId().toString());
        assertThat(originatingUser.get("username")).isEqualTo("trace-api-cashier");
        @SuppressWarnings("unchecked")
        Map<String, Object> details = (Map<String, Object>) row.get("details");
        assertThat(details.get("points")).isEqualTo(25);
        @SuppressWarnings("unchecked")
        Map<String, Object> program = (Map<String, Object>) details.get("program");
        assertThat(program.get("name")).isEqualTo(defaultProgram().getName());
    }

    @Test
    void traceabilityEndpointCanBeFilteredByOperationType() {
        User cashier = createEmployee("trace-type-cashier", TEST_USER_PASSWORD, StaffRole.CASHIER);
        String cashierToken = loginEmployee("trace-type-cashier", TEST_USER_PASSWORD);
        String adminToken = adminToken("trace-type-admin");
        User user = createUser("trace-type-grant-me");

        restTemplate.exchange(
            baseUrl() + "/point-programs/" + defaultProgram().getId() + "/members",
            HttpMethod.POST,
            authed(cashierToken, new JoinPointProgramRequest(user.getId())),
            Void.class
        );
        restTemplate.exchange(
            baseUrl() + "/users/grant",
            HttpMethod.POST,
            authed(cashierToken, new GrantPointsRequest(user.getId(), 25, null)),
            UserPointsAwardResponse.class
        );

        ResponseEntity<List<Map<String, Object>>> matching = restTemplate.exchange(
            baseUrl() + "/traceability?operationType=POINTS_GRANT",
            HttpMethod.GET,
            authed(adminToken),
            new ParameterizedTypeReference<>() {}
        );
        assertThat(matching.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(matching.getBody())
            .extracting(row -> row.get("operationType"))
            .allMatch("POINTS_GRANT"::equals);
        assertThat(matching.getBody()).anySatisfy(row -> {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> affectedUsers = (List<Map<String, Object>>) row.get("affectedUsers");
            assertThat(affectedUsers).anySatisfy(affected -> assertThat(affected.get("id")).isEqualTo(user.getId().toString()));
        });

        ResponseEntity<List<Map<String, Object>>> nonMatching = restTemplate.exchange(
            baseUrl() + "/traceability?operationType=SESSION_REVOKE",
            HttpMethod.GET,
            authed(adminToken),
            new ParameterizedTypeReference<>() {}
        );
        // The shared default org may carry SESSION_REVOKE rows from other tests, but
        // none of them should be this test's POINTS_GRANT user.
        assertThat(nonMatching.getBody()).noneSatisfy(row -> {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> affectedUsers = (List<Map<String, Object>>) row.get("affectedUsers");
            assertThat(affectedUsers).anySatisfy(affected -> assertThat(affected.get("id")).isEqualTo(user.getId().toString()));
        });
    }

    @Test
    void traceabilityEndpointCombinesFiltersWithAnd() {
        User cashier = createEmployee("trace-combo-cashier", TEST_USER_PASSWORD, StaffRole.CASHIER);
        String cashierToken = loginEmployee("trace-combo-cashier", TEST_USER_PASSWORD);
        String adminToken = adminToken("trace-combo-admin");
        User userA = createUser("trace-combo-grant-a");
        User userB = createUser("trace-combo-grant-b");

        for (User target : List.of(userA, userB)) {
            restTemplate.exchange(
                baseUrl() + "/point-programs/" + defaultProgram().getId() + "/members",
                HttpMethod.POST,
                authed(cashierToken, new JoinPointProgramRequest(target.getId())),
                Void.class
            );
            restTemplate.exchange(
                baseUrl() + "/users/grant",
                HttpMethod.POST,
                authed(cashierToken, new GrantPointsRequest(target.getId(), 25, null)),
                UserPointsAwardResponse.class
            );
        }

        // operationType + originatingUserId alone match both grants.
        ResponseEntity<List<Map<String, Object>>> byTypeAndOriginator = restTemplate.exchange(
            baseUrl() + "/traceability?operationType=POINTS_GRANT&originatingUserId=" + cashier.getId(),
            HttpMethod.GET,
            authed(adminToken),
            new ParameterizedTypeReference<>() {}
        );
        assertThat(byTypeAndOriginator.getBody())
            .hasSize(2)
            .allSatisfy(row -> assertThat(row.get("operationType")).isEqualTo("POINTS_GRANT"));

        // Adding affectedUserId narrows it down to exactly userA's row.
        ResponseEntity<List<Map<String, Object>>> narrowed = restTemplate.exchange(
            baseUrl() + "/traceability?operationType=POINTS_GRANT&originatingUserId=" + cashier.getId() + "&affectedUserId=" + userA.getId(),
            HttpMethod.GET,
            authed(adminToken),
            new ParameterizedTypeReference<>() {}
        );
        assertThat(narrowed.getBody()).hasSize(1);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> affectedUsers = (List<Map<String, Object>>) narrowed.getBody().get(0).get("affectedUsers");
        assertThat(affectedUsers).singleElement().satisfies(affected -> assertThat(affected.get("id")).isEqualTo(userA.getId().toString()));

        // An operationType/originator match combined with an unrelated affectedUserId yields nothing.
        ResponseEntity<List<Map<String, Object>>> noMatch = restTemplate.exchange(
            baseUrl() + "/traceability?operationType=POINTS_GRANT&originatingUserId=" + cashier.getId() + "&affectedUserId=" + UUID.randomUUID(),
            HttpMethod.GET,
            authed(adminToken),
            new ParameterizedTypeReference<>() {}
        );
        assertThat(noMatch.getBody()).isEmpty();
    }

    @Test
    void traceabilityEndpointExcludesLogsFromOtherOrganizations() {
        Organization otherOrg = new Organization();
        otherOrg.setName("Other Trace Org");
        otherOrg = organizationRepository.save(otherOrg);

        PointProgram otherProgram = new PointProgram();
        otherProgram.setOrganization(otherOrg);
        otherProgram.setName("Other Puntos");
        otherProgram = pointProgramRepository.save(otherProgram);

        Storefront otherStorefront = new Storefront();
        otherStorefront.setOrganization(otherOrg);
        otherStorefront.setName("Other Storefront");
        otherStorefront.setAddress("1 Other St");
        otherStorefront.setPointProgram(otherProgram);
        otherStorefront = storefrontRepository.save(otherStorefront);

        User otherCashier = createEmployee("trace-other-cashier", TEST_USER_PASSWORD, StaffRole.CASHIER, otherOrg, otherStorefront);
        String otherCashierToken = loginEmployee("trace-other-cashier", TEST_USER_PASSWORD, otherOrg.getId());
        createEmployee("trace-other-admin", TEST_USER_PASSWORD, StaffRole.ADMIN, otherOrg, otherStorefront);
        String otherAdminToken = loginEmployee("trace-other-admin", TEST_USER_PASSWORD, otherOrg.getId());
        String defaultOrgAdminToken = adminToken("trace-isolation-admin");
        User user = createUser("trace-isolation-grant-me");

        restTemplate.exchange(
            baseUrl() + "/point-programs/" + otherProgram.getId() + "/members",
            HttpMethod.POST,
            authed(otherCashierToken, new JoinPointProgramRequest(user.getId())),
            Void.class
        );
        restTemplate.exchange(
            baseUrl() + "/users/grant",
            HttpMethod.POST,
            authed(otherCashierToken, new GrantPointsRequest(user.getId(), 25, null)),
            UserPointsAwardResponse.class
        );

        ResponseEntity<List<Map<String, Object>>> sameOrgView = restTemplate.exchange(
            baseUrl() + "/traceability?affectedUserId=" + user.getId(),
            HttpMethod.GET,
            authed(otherAdminToken),
            new ParameterizedTypeReference<>() {}
        );
        assertThat(sameOrgView.getBody()).hasSize(1);

        ResponseEntity<List<Map<String, Object>>> otherOrgView = restTemplate.exchange(
            baseUrl() + "/traceability?affectedUserId=" + user.getId(),
            HttpMethod.GET,
            authed(defaultOrgAdminToken),
            new ParameterizedTypeReference<>() {}
        );
        assertThat(otherOrgView.getBody()).isEmpty();
    }

    @Test
    void traceabilityEndpointIsForbiddenForNonAdmins() {
        String cashierToken = loginEmployee(createEmployeeCashierForForbiddenTest(), TEST_USER_PASSWORD);

        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl() + "/traceability?affectedUserId=" + UUID.randomUUID(),
            HttpMethod.GET,
            authed(cashierToken),
            String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    private String createEmployeeCashierForForbiddenTest() {
        createEmployee("trace-forbidden-cashier", TEST_USER_PASSWORD, StaffRole.CASHIER);
        return "trace-forbidden-cashier";
    }

    /** Creates an ADMIN at the default org and logs them in, returning the auth token. */
    private String adminToken(String username) {
        createEmployee(username, TEST_USER_PASSWORD, StaffRole.ADMIN);
        return loginEmployee(username, TEST_USER_PASSWORD);
    }
}
