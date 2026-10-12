package studio.gnosticdeveloper.bonusbissen.dto.response;

public record PointsGrantDetails(int points, StorefrontSummary storefront, PointProgramSummary program, String note) implements TraceabilityDetails {}
