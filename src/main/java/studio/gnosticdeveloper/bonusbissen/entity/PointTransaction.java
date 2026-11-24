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
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "point_program_id", nullable = false)
    private PointProgram pointProgram;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "storefront_id", nullable = true)
    private Storefront storefront;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reward_id", nullable = true)
    private Reward reward;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = true)
    private OrganizationStaff employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "refunded_transaction_id", nullable = true)
    private PointTransaction refundedTransaction;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "corrected_transaction_id")
    private PointTransaction correctedTransaction;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "expired_transaction_id")
    private PointTransaction expiredTransaction;

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

    /** Assigned earn deadline; finite period changes preserve it, disabling expiration clears unsettled deadlines. */
    @Column(name = "expires_at")
    private OffsetDateTime expiresAt;

    /** Set once the expiration job has evaluated this lot, whether or not it produced an expire row -- keeps the daily scan bounded. */
    @Column(name = "expiry_settled_at")
    private OffsetDateTime expirySettledAt;

    /** Set when a full-reversal correction zeroed this lot out by hand -- excludes it from ever being re-dated if expiration is re-enabled later. */
    @Column(name = "voided_at")
    private OffsetDateTime voidedAt;

    /** Points a negative correction took off this lot (see migration 19); the row's own points never change. */
    @Column(name = "reduced_points", nullable = false)
    private int reducedPoints;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
        if (transactionType == TransactionType.EARN && voidedAt == null && expiresAt == null && pointProgram != null) {
            expiresAt = pointProgram.computeExpiresAt(createdAt);
        }
    }

    /**
     * Lots are the rows FIFO consumption draws from and the expiration job expires: earn rows and
     * the positive adjust rows a correction adds to a grant. Standalone adjustments are always
     * negative, so a positive row is always a lot.
     */
    public boolean isLot() {
        return points > 0;
    }

    /** What this lot can still contribute in total: nothing once voided, otherwise its points minus what corrections took off. */
    public int getLotPoints() {
        if (!isLot() || voidedAt != null) {
            return 0;
        }
        return Math.max(0, points - reducedPoints);
    }

    public boolean isExpirationApplicable() {
        return voidedAt == null && (transactionType == TransactionType.EARN
            || (transactionType == TransactionType.ADJUST && isLot())
            || (transactionType == TransactionType.EXPIRE && expiredTransaction != null));
    }

    public OffsetDateTime getApplicableExpiresAt() {
        if (!isExpirationApplicable()) {
            return null;
        }
        return transactionType == TransactionType.EXPIRE ? expiredTransaction.getExpiresAt() : expiresAt;
    }

    public Organization getOrganization() {
        return pointProgram != null ? pointProgram.getOrganization() : null;
    }
}
