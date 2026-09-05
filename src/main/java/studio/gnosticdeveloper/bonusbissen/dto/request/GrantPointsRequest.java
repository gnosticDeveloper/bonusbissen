package studio.gnosticdeveloper.bonusbissen.dto.request;

import java.util.UUID;

public record GrantPointsRequest(UUID userId, int points, String note) {}
