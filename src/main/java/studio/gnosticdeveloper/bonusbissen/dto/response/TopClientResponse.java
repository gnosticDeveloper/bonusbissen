package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.util.UUID;

public record TopClientResponse(
        UUID id,
        String name,
        int totalPoints
) {
}
