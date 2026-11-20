package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.time.Instant;
import java.util.UUID;
import studio.gnosticdeveloper.bonusbissen.repository.PointTransactionRepository.PendingQueueRow;

/** One pending redemption in the staff review queue. {@code createdAt} is raw; clients format it. */
public record PendingExchangeReviewResponse(
    UUID id,
    String userName,
    String rewardTitle,
    int points,
    Instant createdAt
) {
    public static PendingExchangeReviewResponse from(PendingQueueRow row) {
        return new PendingExchangeReviewResponse(row.getId(), row.getUserName(), row.getRewardTitle(), row.getPoints(), row.getCreatedAt());
    }
}
