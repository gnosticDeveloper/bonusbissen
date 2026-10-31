package studio.gnosticdeveloper.bonusbissen.entity;

import lombok.Getter;

/** Set to PAID only when a Mercado Pago payment is applied (InvoiceService#applyPayment) -- no endpoint writes it. */
@Getter
public enum PaymentStatus {
    PENDING("pending"),
    PAID("paid");

    private final String value;

    PaymentStatus(String value) {
        this.value = value;
    }
}
