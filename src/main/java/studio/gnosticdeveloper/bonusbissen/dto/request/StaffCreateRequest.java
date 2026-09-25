package studio.gnosticdeveloper.bonusbissen.dto.request;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;
import studio.gnosticdeveloper.bonusbissen.entity.StaffRole;

/**
 * Assigns an existing {@code User} as staff of the caller's organization,
 * instantly linked to {@code storefrontId} (nullable -- e.g. an admin who
 * isn't tied to a single storefront yet).
 */
public record StaffCreateRequest(@NotNull UUID userId, @NotNull StaffRole role, UUID storefrontId) {}
