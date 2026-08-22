package studio.gnosticdeveloper.bonusbissen.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;

public record CustomerCreateRequest(@NotBlank String name, @NotBlank String phone, @PositiveOrZero Integer points) {}
