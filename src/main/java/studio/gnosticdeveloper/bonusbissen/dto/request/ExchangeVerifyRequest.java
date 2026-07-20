package studio.gnosticdeveloper.bonusbissen.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ExchangeVerifyRequest(@NotNull @NotBlank @Size(min = 6, max = 6) String code) {}
