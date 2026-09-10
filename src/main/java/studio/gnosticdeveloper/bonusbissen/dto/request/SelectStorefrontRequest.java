package studio.gnosticdeveloper.bonusbissen.dto.request;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record SelectStorefrontRequest(@NotNull UUID storefrontId) {}
