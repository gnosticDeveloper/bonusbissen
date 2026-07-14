package studio.gnosticdeveloper.bonusbissen.dto.response;

public record LoginResponse(
    String token
    // TODO: This information should be included in the token's payload.
    // UUID sub,
    // String username,
    // String role
) {}
