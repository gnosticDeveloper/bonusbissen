package studio.gnosticdeveloper.bonusbissen.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.util.List;

public record MenuItemCreateRequest(
        @NotBlank String name,
        @NotNull @PositiveOrZero Integer pointsValue,
        @Valid List<MenuItemVariantRequest> variants
) {
}
