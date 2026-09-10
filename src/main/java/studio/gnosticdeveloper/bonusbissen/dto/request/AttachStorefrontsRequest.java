package studio.gnosticdeveloper.bonusbissen.dto.request;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import java.util.UUID;

public record AttachStorefrontsRequest(@NotEmpty List<UUID> storefrontIds) {}
