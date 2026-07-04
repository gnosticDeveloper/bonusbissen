package studio.gnosticdeveloper.bonusbissen.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.PositiveOrZero;

import java.util.List;

public record MenuItemUpdateRequest(
        String name,
        @PositiveOrZero Integer pointsValue,
        Boolean active,
        @Valid List<MenuItemVariantRequest> variants
) {
}
