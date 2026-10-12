package studio.gnosticdeveloper.bonusbissen.dto.response;

public record RewardClaimDetails(RewardSummary reward, int costPoints, PointProgramSummary program) implements TraceabilityDetails {}
