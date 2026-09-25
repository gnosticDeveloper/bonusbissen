package studio.gnosticdeveloper.bonusbissen.dto.response;

public record AdminUserInfoResponse(
    String username,
    String name,
    String role,
    String email,
    boolean emailVerified
) {}
