package studio.gnosticdeveloper.bonusbissen.dto.response;

public record ExchangeUserCancelDetails(TransactionSummary transaction, int points) implements TraceabilityDetails {}
