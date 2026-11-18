package studio.gnosticdeveloper.bonusbissen.dto.request;

import jakarta.validation.constraints.NotNull;
import studio.gnosticdeveloper.bonusbissen.entity.StaffRole;

/** Changes the role of an existing, active staff member. */
public record StaffUpdateRequest(@NotNull StaffRole role) {}
