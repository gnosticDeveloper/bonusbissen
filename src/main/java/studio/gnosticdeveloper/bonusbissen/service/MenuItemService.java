package studio.gnosticdeveloper.bonusbissen.service;

import studio.gnosticdeveloper.bonusbissen.dto.request.MenuItemCreateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.MenuItemUpdateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.MenuItemVariantRequest;
import studio.gnosticdeveloper.bonusbissen.entity.MenuItem;
import studio.gnosticdeveloper.bonusbissen.entity.MenuItemVariant;
import studio.gnosticdeveloper.bonusbissen.exception.BadRequestException;
import studio.gnosticdeveloper.bonusbissen.exception.NotFoundException;
import studio.gnosticdeveloper.bonusbissen.repository.MenuItemRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class MenuItemService {

    private final MenuItemRepository menuItemRepository;

    public MenuItemService(MenuItemRepository menuItemRepository) {
        this.menuItemRepository = menuItemRepository;
    }

    @Transactional(readOnly = true)
    public List<MenuItem> listActive() {
        return menuItemRepository.findByActiveTrue();
    }

    @Transactional
    public MenuItem create(MenuItemCreateRequest request) {
        MenuItem menuItem = new MenuItem();
        menuItem.setName(request.name());
        menuItem.setPointsValue(request.pointsValue());
        menuItem.replaceVariants(toVariants(request.variants()));
        return menuItemRepository.save(menuItem);
    }

    @Transactional
    public MenuItem update(UUID id, MenuItemUpdateRequest request) {
        MenuItem menuItem = menuItemRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Menu item not found: " + id));

        if (request.name() != null) {
            menuItem.setName(request.name());
        }
        if (request.pointsValue() != null) {
            menuItem.setPointsValue(request.pointsValue());
        }
        if (request.active() != null) {
            menuItem.setActive(request.active());
        }
        if (request.variants() != null) {
            menuItem.replaceVariants(toVariants(request.variants()));
        }
        return menuItemRepository.save(menuItem);
    }

    private List<MenuItemVariant> toVariants(List<MenuItemVariantRequest> requests) {
        if (requests == null) {
            return List.of();
        }
        List<MenuItemVariant> variants = requests.stream()
                .map(v -> new MenuItemVariant(v.name(), v.pointsValue()))
                .toList();
        long distinctNames = variants.stream()
                .map(v -> v.getName().toLowerCase(Locale.ROOT))
                .distinct()
                .count();
        if (distinctNames != variants.size()) {
            throw new BadRequestException("Variant names must be unique within a menu item");
        }
        return variants;
    }
}
