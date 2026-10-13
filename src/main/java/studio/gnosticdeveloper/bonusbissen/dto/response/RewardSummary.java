package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.util.UUID;
import studio.gnosticdeveloper.bonusbissen.entity.Reward;

public record RewardSummary(UUID id, String title) {
    public static RewardSummary from(Reward reward) {
        return new RewardSummary(reward.getId(), reward.getTitle());
    }

    public static RewardSummary unknown(UUID id) {
        return new RewardSummary(id, null);
    }
}
