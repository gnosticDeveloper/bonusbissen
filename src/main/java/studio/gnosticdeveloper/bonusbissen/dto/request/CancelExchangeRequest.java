package studio.gnosticdeveloper.bonusbissen.dto.request;

import java.util.UUID;

public record CancelExchangeRequest(UUID id, UUID employeeId, boolean shouldRefundPoints) {
}
