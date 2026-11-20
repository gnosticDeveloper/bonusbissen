package studio.gnosticdeveloper.bonusbissen.entity;

import lombok.Getter;

@Getter
public enum OperationType {
    SESSION_REVOKE("session_revoke"),
    STAFF_CREATE("staff_create"),
    STAFF_ROLE_UPDATE("staff_role_update"),
    USER_CREATE("user_create"),
    POINTS_GRANT("points_grant"),
    POINTS_CORRECTION("points_correction"),
    REWARD_CLAIM("reward_claim"),
    EXCHANGE_VERIFY("exchange_verify"),
    EXCHANGE_APPROVE("exchange_approve"),
    EXCHANGE_CANCEL("exchange_cancel"),
    EXCHANGE_USER_CANCEL("exchange_user_cancel"),
    STAFF_DEACTIVATE("staff_deactivate"),
    STAFF_STOREFRONTS_UPDATE("staff_storefronts_update"),
    USER_UPDATE("user_update"),
    USER_DEACTIVATE("user_deactivate"),
    USER_REACTIVATE("user_reactivate"),
    PASSWORD_CHANGE("password_change"),
    POINT_PROGRAM_UPDATE("point_program_update"),
    PROGRAM_STOREFRONTS_UPDATE("program_storefronts_update"),
    ORGANIZATION_DEACTIVATE("organization_deactivate");

    private final String value;

    OperationType(String value) {
        this.value = value;
    }

}
