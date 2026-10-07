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
    List<TraceabilityLog> findAllByOriginatingUser_Id(UUID originatingUserId);

    List<TraceabilityLog> findAllByAffectedUserIdsContains(UUID affectedUserId);

    /** Bulk-deletes expired, non-exempt rows in one statement; ON DELETE CASCADE clears their affected-user rows. */
    @Modifying
    @Query("DELETE FROM TraceabilityLog t WHERE t.createdAt < :cutoff AND t.operationType NOT IN :exemptTypes")
    int purgeOlderThan(@Param("cutoff") OffsetDateTime cutoff, @Param("exemptTypes") Collection<OperationType> exemptTypes);
}
