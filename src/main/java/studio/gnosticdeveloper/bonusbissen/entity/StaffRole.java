package studio.gnosticdeveloper.bonusbissen.entity;

public enum StaffRole {
    ADMIN("admin"),
    CASHIER("cashier");

    private final String dbValue;

    StaffRole(String dbValue) {
        this.dbValue = dbValue;
    }

    public String dbValue() {
        return dbValue;
    }

    public static StaffRole fromDbValue(String dbValue) {
        for (StaffRole role : values()) {
            if (role.dbValue.equals(dbValue)) {
                return role;
            }
        }
        throw new IllegalArgumentException("Unknown staff role: " + dbValue);
    }
}
