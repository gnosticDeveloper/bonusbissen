package studio.gnosticdeveloper.bonusbissen.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record ExchangeCreateRequest(
    @NotBlank String customerDocument, // TODO: Change document for the customer's ID but validate it with the JWT.
    @NotNull UUID rewardId,
    @NotNull Integer pointsCost,
    @NotBlank String rewardName
) {}
