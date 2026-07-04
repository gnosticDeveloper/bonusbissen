package studio.gnosticdeveloper.bonusbissen.entity;

public enum TransactionType {
    PURCHASE("purchase"),
    REDEMPTION("redemption");

    private final String dbValue;

    TransactionType(String dbValue) {
        this.dbValue = dbValue;
    }

    public String dbValue() {
        return dbValue;
    }

    public static TransactionType fromDbValue(String dbValue) {
        for (TransactionType type : values()) {
            if (type.dbValue.equals(dbValue)) {
                return type;
            }
        }
        throw new IllegalArgumentException("Unknown transaction type: " + dbValue);
    }
}
