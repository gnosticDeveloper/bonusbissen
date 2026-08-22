package studio.gnosticdeveloper.bonusbissen.entity;

import jakarta.persistence.*;

import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "point_transactions")
@Getter
@Setter
@NoArgsConstructor
public class PointTransaction {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reward_id", nullable = true)
    private Reward reward;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = true)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "refunded_transaction_id", nullable = true)
    private PointTransaction refundedTransaction;

    @Convert(converter = TransactionTypeConverter.class)
    @Column(name = "transaction_type", nullable = false)
    private TransactionType transactionType;

    @Column(name = "points", nullable = false)
    private int points;

    @Column(columnDefinition = "text")
    private String note;

    @Convert(converter = TransactionStateConverter.class)
    @Column(nullable = false)
    private TransactionState state;

    @OneToOne(mappedBy = "pointTransaction", fetch = FetchType.LAZY)
    private ExchangeCode exchangeCode;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }


    public Organization getOrganization() {
        if (reward != null) return reward.getOrganization();
        if (employee != null) return employee.getOrganization();
        if (refundedTransaction != null) return refundedTransaction.getOrganization();
        return null;
    }
}
