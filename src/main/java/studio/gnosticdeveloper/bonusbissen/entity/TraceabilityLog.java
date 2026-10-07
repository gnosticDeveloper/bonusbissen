package studio.gnosticdeveloper.bonusbissen.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * One row per logical operation -- {@code operationId} is the row's own primary
 * key, with {@code affectedUserIds} holding its 1..N affected users so a bulk
 * operation is one row with many child rows instead of many parent rows sharing
 * a correlation value.
 */
@Entity
@Table(name = "traceability_logs")
@Getter
@Setter
@NoArgsConstructor
public class TraceabilityLog {

    @Id
    @GeneratedValue
    @Column(name = "operation_id")
    private UUID operationId;

    @Convert(converter = OperationTypeConverter.class)
    @Column(name = "operation_type", nullable = false, length = 64)
    private OperationType operationType;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "originating_user_id", nullable = false)
    private User originatingUser;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "traceability_log_affected_users", joinColumns = @JoinColumn(name = "operation_id"))
    @Column(name = "affected_user_id")
    private Set<UUID> affectedUserIds = new HashSet<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload", nullable = false)
    private Map<String, Object> payload = Map.of();

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }
}
