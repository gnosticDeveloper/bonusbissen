package studio.gnosticdeveloper.bonusbissen.dto.response;

import studio.gnosticdeveloper.bonusbissen.entity.MenuItem;

import java.util.List;
import java.util.UUID;

public record MenuItemResponse(
        UUID id,
        String name,
        int pointsValue,
        boolean active,
        List<MenuItemVariantResponse> variants
) {
    public static MenuItemResponse from(MenuItem menuItem) {
        List<MenuItemVariantResponse> variants = menuItem.getVariants().stream().map(MenuItemVariantResponse::from).toList();
        return new MenuItemResponse(menuItem.getId(), menuItem.getName(), menuItem.getPointsValue(), menuItem.isActive(), variants);
    }
}
