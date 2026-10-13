package studio.gnosticdeveloper.bonusbissen.dto.request;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record GrantPointsRequest(@NotNull UUID userId, int points, String note, boolean allowDebt) {
    public GrantPointsRequest(UUID userId, int points, String note) {
        this(userId, points, note, false);
    }
}
