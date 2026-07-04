package studio.gnosticdeveloper.bonusbissen.entity;

public enum BenefitType {
    FREE_ITEM("free_item"),
    DISCOUNT_FIXED("discount_fixed"),
    DISCOUNT_PERCENTAGE("discount_percentage");

    private final String dbValue;

    BenefitType(String dbValue) {
        this.dbValue = dbValue;
    }

    public String dbValue() {
        return dbValue;
    }

    public static BenefitType fromDbValue(String dbValue) {
        for (BenefitType type : values()) {
            if (type.dbValue.equals(dbValue)) {
                return type;
            }
        }
        throw new IllegalArgumentException("Unknown benefit type: " + dbValue);
    }
}
