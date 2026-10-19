package studio.gnosticdeveloper.bonusbissen.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * One row per billed cycle for an organization. {@code amount}/{@code lineItems}
 * are a snapshot taken at generation time -- a plan's price changing later
 * never alters a past invoice. No PDF is stored; {@code InvoiceDocumentService}
 * regenerates the document on demand from this snapshot.
 *
 * {@code paymentStatus} only ever moves to PAID by a direct database update --
 * there is no endpoint for it (see 9__billing.sql for why).
 */
@Entity
@Table(name = "invoices")
@Getter
@Setter
@NoArgsConstructor
public class Invoice {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Column(name = "billing_cycle", nullable = false, length = 16)
    private BillingCycle billingCycle;

    @Column(name = "due_at", nullable = false)
    private OffsetDateTime dueAt;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 3)
    private String currency;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "line_items", nullable = false)
    private List<Map<String, Object>> lineItems = List.of();

    @Column(name = "payment_status", nullable = false, length = 16)
    private PaymentStatus paymentStatus = PaymentStatus.PENDING;

    @Column(name = "paid_at")
    private OffsetDateTime paidAt;

    @Column(name = "payment_reference")
    private String paymentReference;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }
}
