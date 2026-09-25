package studio.gnosticdeveloper.bonusbissen.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record GrantPointsUpdateRequest(@NotNull @Positive Integer points, String note) {}
