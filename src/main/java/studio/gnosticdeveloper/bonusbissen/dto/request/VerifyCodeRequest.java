package studio.gnosticdeveloper.bonusbissen.dto.request;

import jakarta.validation.constraints.NotNull;

public record VerifyCodeRequest(@NotNull String code) {}
