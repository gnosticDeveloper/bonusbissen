package studio.gnosticdeveloper.bonusbissen.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public record MenuItemVariantRequest(
        @NotBlank String name,
        @NotNull @PositiveOrZero Integer pointsValue
) {
}
