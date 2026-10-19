package studio.gnosticdeveloper.bonusbissen.entity;

import lombok.Getter;

/** Only ever set to PAID by a direct database update -- no endpoint writes it (see 9__billing.sql). To be properly used after payment gateway integration */
@Getter
public enum PaymentStatus {
    PENDING("pending"),
    PAID("paid");

    private final String value;

    PaymentStatus(String value) {
        this.value = value;
    }
}
