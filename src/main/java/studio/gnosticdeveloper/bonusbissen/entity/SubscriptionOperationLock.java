package studio.gnosticdeveloper.bonusbissen.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** See the subscription_operation_locks table in 15__subscription_cancellation.sql. Only ever written through SubscriptionOperationLockRepository's targeted statements. */
@Entity
@Table(name = "subscription_operation_locks")
@Getter
@Setter
@NoArgsConstructor
public class SubscriptionOperationLock {

    @Id
    @Column(name = "organization_id")
    private UUID organizationId;

    @Column(nullable = false)
    private UUID holder;

    @Column(name = "acquired_at", nullable = false)
    private OffsetDateTime acquiredAt;
}
