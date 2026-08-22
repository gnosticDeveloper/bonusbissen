package studio.gnosticdeveloper.bonusbissen.dto.request;

import jakarta.validation.constraints.NotBlank;

public record CustomerUpdateRequest(@NotBlank String name, @NotBlank String phone) {}
