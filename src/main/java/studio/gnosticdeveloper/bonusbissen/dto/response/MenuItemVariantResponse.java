package studio.gnosticdeveloper.bonusbissen.dto.response;

import studio.gnosticdeveloper.bonusbissen.entity.MenuItemVariant;

import java.util.UUID;

public record MenuItemVariantResponse(UUID id, String name, int pointsValue) {
    public static MenuItemVariantResponse from(MenuItemVariant variant) {
        return new MenuItemVariantResponse(variant.getId(), variant.getName(), variant.getPointsValue());
    }
}
