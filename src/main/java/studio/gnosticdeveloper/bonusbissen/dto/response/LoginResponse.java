package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.util.UUID;

public record LoginResponse(
        String token,
        UUID employeeId,
        String username,
        String role
) {
}
