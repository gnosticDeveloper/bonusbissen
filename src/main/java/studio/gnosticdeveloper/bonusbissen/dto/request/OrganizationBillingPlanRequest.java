package studio.gnosticdeveloper.bonusbissen.dto.request;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/**
 * Self-service plan selection/change -- the org picks its own plan. Billing
 * cycle isn't chosen here: only MONTHLY exists for now (see BillingCycle).
 */
public record OrganizationBillingPlanRequest(@NotNull UUID billingPlanId) {}
