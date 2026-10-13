package studio.gnosticdeveloper.bonusbissen.repository;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import studio.gnosticdeveloper.bonusbissen.entity.OperationType;
import studio.gnosticdeveloper.bonusbissen.entity.TraceabilityLog;

public interface TraceabilityLogRepository extends JpaRepository<TraceabilityLog, UUID> {
    /**
     * Combines the three filters with AND -- each is applied only when non-null, so any
     * subset (including all three) can be given together. The LEFT JOIN against the
     * affectedUserIds collection table fans a log with N affected users out to N rows when
     * affectedUserId isn't filtering it down to one, hence the DISTINCT.
     */
    @Query(
        """
        SELECT DISTINCT t FROM TraceabilityLog t LEFT JOIN t.affectedUserIds a
        WHERE (:operationType IS NULL OR t.operationType = :operationType)
          AND (:originatingUserId IS NULL OR t.originatingUser.id = :originatingUserId)
          AND (:affectedUserId IS NULL OR a = :affectedUserId)
        """
    )
    List<TraceabilityLog> search(
        @Param("operationType") OperationType operationType,
        @Param("originatingUserId") UUID originatingUserId,
        @Param("affectedUserId") UUID affectedUserId
    );

    /** Bulk-deletes expired, non-exempt rows in one statement; ON DELETE CASCADE clears their affected-user rows. */
    @Modifying
    @Query("DELETE FROM TraceabilityLog t WHERE t.createdAt < :cutoff AND t.operationType NOT IN :exemptTypes")
    int purgeOlderThan(@Param("cutoff") OffsetDateTime cutoff, @Param("exemptTypes") Collection<OperationType> exemptTypes);
}
