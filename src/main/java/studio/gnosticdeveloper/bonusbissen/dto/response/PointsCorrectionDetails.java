package studio.gnosticdeveloper.bonusbissen.dto.response;

public record PointsCorrectionDetails(TransactionSummary transaction, TransactionSummary correctedTransaction, int points, String note)
    implements TraceabilityDetails {}
