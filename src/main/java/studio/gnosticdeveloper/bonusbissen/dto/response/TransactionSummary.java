package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.util.UUID;
import studio.gnosticdeveloper.bonusbissen.entity.PointTransaction;

public record TransactionSummary(UUID id, PointProgramSummary program, StorefrontSummary storefront, RewardSummary reward) {
    public static TransactionSummary from(PointTransaction transaction) {
        return new TransactionSummary(
            transaction.getId(),
            PointProgramSummary.from(transaction.getPointProgram()),
            transaction.getStorefront() == null ? null : StorefrontSummary.from(transaction.getStorefront()),
            transaction.getReward() == null ? null : RewardSummary.from(transaction.getReward())
        );
    }

    public static TransactionSummary unknown(UUID id) {
        return new TransactionSummary(id, null, null, null);
    }
}
