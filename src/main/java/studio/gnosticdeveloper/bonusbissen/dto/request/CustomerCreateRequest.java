package studio.gnosticdeveloper.bonusbissen.dto.request;

import jakarta.validation.constraints.NotBlank;

public record CustomerCreateRequest(@NotBlank String name, @NotBlank String phone) {}
