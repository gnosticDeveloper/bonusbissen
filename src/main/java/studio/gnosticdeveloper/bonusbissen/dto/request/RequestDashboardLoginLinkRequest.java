package studio.gnosticdeveloper.bonusbissen.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/** {@code organizationId} is a guard -- a mismatch is treated as no-op, same as DashboardLoginRequest. */
public record RequestDashboardLoginLinkRequest(
    @NotBlank String identifier,
    @NotNull UUID organizationId
) {}
