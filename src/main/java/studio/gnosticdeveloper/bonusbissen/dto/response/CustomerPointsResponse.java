package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.util.UUID;

public record CustomerPointsResponse(UUID id, String name, String phone, Integer points) {}
