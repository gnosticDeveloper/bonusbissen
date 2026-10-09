package studio.gnosticdeveloper.bonusbissen.entity;

import lombok.Getter;

@Getter
public enum OperationType {
    SESSION_REVOKE("session_revoke"),
    STAFF_CREATE("staff_create"),
    USER_CREATE("user_create"),
    POINTS_GRANT("points_grant"),
    POINTS_CORRECTION("points_correction"),
    REWARD_CLAIM("reward_claim"),
    EXCHANGE_VERIFY("exchange_verify"),
    EXCHANGE_APPROVE("exchange_approve"),
    EXCHANGE_CANCEL("exchange_cancel"),
    EXCHANGE_USER_CANCEL("exchange_user_cancel");

    private final String value;

    OperationType(String value) {
        this.value = value;
    }

}
