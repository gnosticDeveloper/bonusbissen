package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.util.UUID;
import studio.gnosticdeveloper.bonusbissen.entity.Storefront;

public record StorefrontSummary(UUID id, String name) {
    public static StorefrontSummary from(Storefront storefront) {
        return new StorefrontSummary(storefront.getId(), storefront.getName());
    }
}
