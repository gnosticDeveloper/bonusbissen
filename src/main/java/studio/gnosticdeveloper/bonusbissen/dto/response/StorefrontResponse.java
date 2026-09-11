package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.util.UUID;
import studio.gnosticdeveloper.bonusbissen.entity.Storefront;

public record StorefrontResponse(
    UUID id,
    String name,
    boolean online,
    String address,
    String city,
    String category,
    String color,
    String hours,
    String iconUrl,
    String description,
    boolean active
) {
    public static StorefrontResponse from(Storefront s) {
        return new StorefrontResponse(
            s.getId(),
            s.getName(),
            s.isOnline(),
            s.getAddress(),
            s.getCity(),
            s.getCategory(),
            s.getColor(),
            s.getHours(),
            s.getIconPath(),
            s.getDescription(),
            s.isActive()
        );
    }
}
