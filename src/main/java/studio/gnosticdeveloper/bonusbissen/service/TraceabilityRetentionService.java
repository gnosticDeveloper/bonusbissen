package studio.gnosticdeveloper.bonusbissen.service;

import java.time.OffsetDateTime;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import studio.gnosticdeveloper.bonusbissen.entity.OperationType;
import studio.gnosticdeveloper.bonusbissen.repository.TraceabilityLogRepository;

/**
 * Bounds the growth of traceability_logs. Staff/permission records and manual
 * (ARS-amount) point grants are kept indefinitely for audit; everything
 * else: logins, session revocations, and eventually derived/automated point
 * assignments, purges after the retention window. New operation types default
 * to purgeable unless explicitly added here.
 */
@Service
public class TraceabilityRetentionService {

    private static final Logger log = LoggerFactory.getLogger(TraceabilityRetentionService.class);

    private static final Set<OperationType> EXEMPT_FROM_PURGE = Set.of(OperationType.STAFF_CREATE, OperationType.POINTS_GRANT);

    private final TraceabilityLogRepository traceabilityLogRepository;
    private final int retentionMonths;

    public TraceabilityRetentionService(
        TraceabilityLogRepository traceabilityLogRepository,
        @Value("${app.traceability.retention-months}") int retentionMonths
    ) {
        this.traceabilityLogRepository = traceabilityLogRepository;
        this.retentionMonths = retentionMonths;
    }

    @Scheduled(cron = "${app.traceability.retention-cron}")
    @Transactional
    public void runScheduledPurge() {
        try {
            int purged = purgeExpired();
            log.info("Purged {} expired traceability log(s)", purged);
        } catch (Exception e) {
            log.error("Traceability log purge failed", e);
        }
    }

    // Also @Transactional on runScheduledPurge(): that method calls this one via a plain
    // `this` self-invocation, which Spring's proxy-based AOP can't intercept, so this
    // annotation alone has no effect on the scheduled path (self-invocation caveat).
    @Transactional
    public int purgeExpired() {
        OffsetDateTime cutoff = OffsetDateTime.now().minusMonths(retentionMonths);
        return traceabilityLogRepository.purgeOlderThan(cutoff, EXEMPT_FROM_PURGE);
    }
}
