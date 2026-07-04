package studio.gnosticdeveloper.bonusbissen.entity;

public enum EmployeeRole {
    ADMIN("admin"),
    CASHIER("cashier");

    private final String dbValue;

    EmployeeRole(String dbValue) {
        this.dbValue = dbValue;
    }

    public String dbValue() {
        return dbValue;
    }

    public static EmployeeRole fromDbValue(String dbValue) {
        for (EmployeeRole role : values()) {
            if (role.dbValue.equals(dbValue)) {
                return role;
            }
        }
        throw new IllegalArgumentException("Unknown employee role: " + dbValue);
    }
}
