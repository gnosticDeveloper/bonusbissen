package studio.gnosticdeveloper.bonusbissen.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/** {@code organizationId} is a guard -- a mismatch is treated as bad credentials. */
public record DashboardLoginRequest(
    @NotBlank String identifier,
    @NotBlank String password,
    @NotNull UUID organizationId
) {}
