package studio.gnosticdeveloper.bonusbissen.dto.response;

public record ExchangeVerifyDetails(TransactionSummary transaction, String code) implements TraceabilityDetails {}
