package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.util.List;

/** The oldest {@code items} of the pending queue, and how many redemptions are pending in all. */
public record PendingExchangeQueueResponse(long total, List<PendingExchangeReviewResponse> items) {}
