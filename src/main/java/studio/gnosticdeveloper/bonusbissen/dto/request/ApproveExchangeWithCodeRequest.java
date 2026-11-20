package studio.gnosticdeveloper.bonusbissen.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

/** Approves the redemption {@code id} only if {@code code} is the one the customer was given for it. */
public record ApproveExchangeWithCodeRequest(@NotNull UUID id, @NotBlank @Size(min = 6, max = 6) String code) {}
