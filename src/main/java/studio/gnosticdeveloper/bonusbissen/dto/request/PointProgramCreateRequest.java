package studio.gnosticdeveloper.bonusbissen.dto.request;

import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.UUID;

public record PointProgramCreateRequest(
    @NotBlank String name,
    String unitLabel,
    List<UUID> storefrontIds
) {}
