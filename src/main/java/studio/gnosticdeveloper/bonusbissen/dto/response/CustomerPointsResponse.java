package studio.gnosticdeveloper.bonusbissen.dto.response;

public record CustomerPointsResponse(
        String document,
        String name,
        int totalPoints
) {
}
