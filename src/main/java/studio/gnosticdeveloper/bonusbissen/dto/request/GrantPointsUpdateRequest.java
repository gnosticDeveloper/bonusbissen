package studio.gnosticdeveloper.bonusbissen.dto.request;

import jakarta.validation.constraints.NotNull;

public record GrantPointsUpdateRequest(@NotNull Integer points, @NotNull String note, boolean allowDebt) {
    public GrantPointsUpdateRequest(Integer points, String note) {
        this(points, note, false);
    }
}
