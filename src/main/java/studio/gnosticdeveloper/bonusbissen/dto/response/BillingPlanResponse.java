package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.math.BigDecimal;
import java.util.UUID;
import studio.gnosticdeveloper.bonusbissen.entity.BillingPlan;

public record BillingPlanResponse(UUID id, String name, BigDecimal price, String currency) {
    public static BillingPlanResponse from(BillingPlan plan) {
        return new BillingPlanResponse(plan.getId(), plan.getName(), plan.getPrice(), plan.getCurrency());
    }
}
