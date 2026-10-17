package studio.gnosticdeveloper.bonusbissen.entity;

import lombok.Getter;

@Getter
public enum TransactionType {
    REDEEM("redeem"),
    EARN("earn"),
    ADJUST("adjust"),
    EXPIRE("expire");

    private final String value;

    TransactionType(String value) {
        this.value = value;
    }

}
