package studio.gnosticdeveloper.bonusbissen.dto.response;

public record ExchangeApproveDetails(TransactionSummary transaction, int points) implements TraceabilityDetails {}
