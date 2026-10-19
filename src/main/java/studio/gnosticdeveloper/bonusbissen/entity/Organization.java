package studio.gnosticdeveloper.bonusbissen.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "organizations")
@Getter
@Setter
@NoArgsConstructor
public class Organization {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(name = "logo_path", length = 255)
    private String logoPath;

    @Column(name = "banner_path", length = 255)
    private String bannerPath;

    @Column(name = "fiscal_name")
    private String fiscalName;

    @Column(name = "tax_id", length = 32)
    private String taxId;

    @Column(name = "fiscal_address")
    private String fiscalAddress;

    @Column(name = "iva_condition", length = 32)
    private IvaCondition ivaCondition;

    @Column(name = "billing_email")
    private String billingEmail;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "billing_plan_id")
    private BillingPlan billingPlan;

    @Column(name = "billing_cycle", length = 16)
    private BillingCycle billingCycle;

    @Column(name = "next_invoice_due_at")
    private OffsetDateTime nextInvoiceDueAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }
}
