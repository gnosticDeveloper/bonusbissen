package studio.gnosticdeveloper.bonusbissen.dto.request;

import jakarta.validation.constraints.NotBlank;

public record StorefrontCreateRequest(
    @NotBlank String name,
    boolean online,
    String address,
    String category,
    String color,
    String hours,
    String icon,
    String description
) {}
