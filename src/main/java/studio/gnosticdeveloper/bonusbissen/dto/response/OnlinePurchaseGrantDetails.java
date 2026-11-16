package studio.gnosticdeveloper.bonusbissen.dto.response;

public record OnlinePurchaseGrantDetails(
    int points,
    PointProgramSummary program,
    String orderId,
    String amount,
    String currency
) implements TraceabilityDetails {}
