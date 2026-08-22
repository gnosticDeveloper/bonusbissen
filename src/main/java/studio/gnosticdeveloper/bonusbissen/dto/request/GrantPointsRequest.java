package studio.gnosticdeveloper.bonusbissen.dto.request;

import java.util.UUID;

public record GrantPointsRequest(UUID customerId, int points, String note) {}
