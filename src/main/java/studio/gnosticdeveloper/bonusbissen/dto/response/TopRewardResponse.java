package studio.gnosticdeveloper.bonusbissen.dto.response;

import studio.gnosticdeveloper.bonusbissen.entity.Reward;

import java.util.UUID;

public record TopRewardResponse(
        UUID id,
        String title,
        int claimCount,
        int points
) {

    public static TopRewardResponse from(Reward reward, int claimCount) {

        return new TopRewardResponse(
                reward.getId(),
                reward.getTitle(),
                claimCount,
                reward.getCostPoints()
        );
    }
}
