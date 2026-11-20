package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.util.UUID;
import studio.gnosticdeveloper.bonusbissen.entity.Reward;

/** An active reward nobody has claimed in the dashboard window. */
public record UnclaimedRewardResponse(UUID id, String title, int points) {
    public static UnclaimedRewardResponse from(Reward reward) {
        return new UnclaimedRewardResponse(reward.getId(), reward.getTitle(), reward.getCostPoints());
    }
}
