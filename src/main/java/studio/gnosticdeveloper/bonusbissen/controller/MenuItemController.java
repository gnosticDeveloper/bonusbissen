package studio.gnosticdeveloper.bonusbissen.controller;

import studio.gnosticdeveloper.bonusbissen.dto.request.MenuItemCreateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.MenuItemUpdateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.MenuItemResponse;
import studio.gnosticdeveloper.bonusbissen.service.MenuItemService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/menu-items")
public class MenuItemController {

    private final MenuItemService menuItemService;

    public MenuItemController(MenuItemService menuItemService) {
        this.menuItemService = menuItemService;
    }

    @GetMapping
    public List<MenuItemResponse> list() {
        return menuItemService.listActive().stream().map(MenuItemResponse::from).toList();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public MenuItemResponse create(@Valid @RequestBody MenuItemCreateRequest request) {
        return MenuItemResponse.from(menuItemService.create(request));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public MenuItemResponse update(@PathVariable UUID id, @Valid @RequestBody MenuItemUpdateRequest request) {
        return MenuItemResponse.from(menuItemService.update(id, request));
    }
}
