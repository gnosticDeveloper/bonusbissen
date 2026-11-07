package studio.gnosticdeveloper.bonusbissen.repository;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import studio.gnosticdeveloper.bonusbissen.entity.SubscriptionOperationLock;

/**
 * Both statements commit on their own (they're @Transactional here), because the caller holds
 * no transaction across its calls to Mercado Pago -- see MercadoPagoSubscriptionService.
 */
public interface SubscriptionOperationLockRepository extends JpaRepository<SubscriptionOperationLock, UUID> {

    /**
     * Atomically takes the org's lease: inserts it, or takes over an existing one that is older
     * than {@code ttlSeconds} (its holder died). Returns 1 if this caller now holds it, 0 if
     * someone else does.
     */
    @Modifying
    @Transactional
    @Query(value = """
        insert into subscription_operation_locks (organization_id, holder, acquired_at)
        values (:organizationId, :holder, now())
        on conflict (organization_id) do update
            set holder = excluded.holder, acquired_at = excluded.acquired_at
            where subscription_operation_locks.acquired_at < now() - make_interval(secs => cast(:ttlSeconds as double precision))
        """, nativeQuery = true)
    int tryAcquire(@Param("organizationId") UUID organizationId, @Param("holder") UUID holder, @Param("ttlSeconds") double ttlSeconds);

    /** Releases only the caller's own lease: a no-op (0) if it expired and someone else took it over. */
    @Modifying
    @Transactional
    @Query("delete from SubscriptionOperationLock l where l.organizationId = :organizationId and l.holder = :holder")
    int release(@Param("organizationId") UUID organizationId, @Param("holder") UUID holder);
}
