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

    /** Mercado Pago's preapproval id -- the org's recurring-charge authorization (see MercadoPagoSubscriptionService). */
    @Column(name = "mercado_pago_preapproval_id")
    private String mercadoPagoPreapprovalId;

    /** Mirrors Mercado Pago's preapproval status (pending/authorized/paused/cancelled) -- informational, kept in sync by the webhook. */
    @Column(name = "mercado_pago_preapproval_status", length = 32)
    private String mercadoPagoPreapprovalStatus;

    /** Email of the Mercado Pago account that pays the subscription -- not billingEmail, which is only where invoices are mailed. */
    @Column(name = "mercado_pago_payer_email")
    private String mercadoPagoPayerEmail;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }
}
