package studio.gnosticdeveloper.bonusbissen.dto.request;

import jakarta.validation.constraints.NotBlank;

public record OrganizationUpdateRequest(@NotBlank String name, String icon, String hours, String address, String description) {}
