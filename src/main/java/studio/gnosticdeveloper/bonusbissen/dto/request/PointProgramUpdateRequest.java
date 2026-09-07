package studio.gnosticdeveloper.bonusbissen.dto.request;

import jakarta.validation.constraints.NotBlank;

public record PointProgramUpdateRequest(
    @NotBlank String name,
    String unitLabel,
    Boolean active
) {}
