package studio.gnosticdeveloper.bonusbissen.dto.response;

public record ExchangeCancelDetails(TransactionSummary transaction, int points, boolean refunded) implements TraceabilityDetails {}
