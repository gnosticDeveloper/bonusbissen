package studio.gnosticdeveloper.bonusbissen.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * An approved Mercado Pago authorized payment, keyed by MP's own id (see
 * 11__mercadopago_payments.sql). {@code invoice} is null until the payment
 * has been applied -- it can arrive before the invoice it pays exists.
 */
@Entity
@Table(name = "mercado_pago_payments")
@Getter
@Setter
@NoArgsConstructor
public class MercadoPagoPayment {

    @Id
    @Column(name = "authorized_payment_id")
    private String authorizedPaymentId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Column(precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(length = 3)
    private String currency;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id")
    private Invoice invoice;

    @Column(name = "received_at", nullable = false, updatable = false)
    private OffsetDateTime receivedAt;

    @PrePersist
    protected void onCreate() {
        if (receivedAt == null) {
            receivedAt = OffsetDateTime.now();
        }
    }
}
