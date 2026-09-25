package studio.gnosticdeveloper.bonusbissen.dto.request;

import jakarta.validation.constraints.NotBlank;

public record StorefrontUpdateRequest(
    @NotBlank String name,
    boolean online,
    String address,
    String city,
    String province,
    String category,
    String color,
    String hours,
    String phone,
    String icon,
    String description,
    Boolean active
) {}
