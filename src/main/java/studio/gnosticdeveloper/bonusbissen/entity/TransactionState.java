package studio.gnosticdeveloper.bonusbissen.entity;

public enum TransactionState {
    PENDING("pending"),
    DELIVERED("delivered"),
    CANCELLED("cancelled");

    private final String value;

    TransactionState(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
}
