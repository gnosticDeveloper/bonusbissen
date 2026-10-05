package studio.gnosticdeveloper.bonusbissen.integration;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import studio.gnosticdeveloper.bonusbissen.entity.OperationType;
import studio.gnosticdeveloper.bonusbissen.entity.TraceabilityLog;
import studio.gnosticdeveloper.bonusbissen.entity.User;
import studio.gnosticdeveloper.bonusbissen.exception.BadRequestException;
import studio.gnosticdeveloper.bonusbissen.repository.TraceabilityLogRepository;
import studio.gnosticdeveloper.bonusbissen.service.TraceabilityRetentionService;
import studio.gnosticdeveloper.bonusbissen.service.TraceabilityService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Exercises TraceabilityService/TraceabilityRetentionService directly. Tests for the
 * actual wiring into existing operations (staff, sessions, signup, grants, exchanges)
 * live alongside that wiring instead of here.
 */
class TraceabilityIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TraceabilityService traceabilityService;
    @Autowired
    private TraceabilityRetentionService traceabilityRetentionService;
    @Autowired
    private TraceabilityLogRepository traceabilityLogRepository;

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

        List<TraceabilityLog> logs = traceabilityService.find(operationId, null, null);
        assertThat(logs).hasSize(1);
        assertThat(logs.get(0).getAffectedUserIds()).containsExactlyInAnyOrder(affectedOne.getId(), affectedTwo.getId());
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
}
