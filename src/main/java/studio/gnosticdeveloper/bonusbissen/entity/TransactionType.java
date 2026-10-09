package studio.gnosticdeveloper.bonusbissen.entity;

public enum TransactionType {
    REDEEM("redeem"),
    EARN("earn"),
    ADJUST("adjust");

    private final String value;

    TransactionType(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
}
