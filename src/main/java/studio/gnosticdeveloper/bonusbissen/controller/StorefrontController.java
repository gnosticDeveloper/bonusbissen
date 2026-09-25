package studio.gnosticdeveloper.bonusbissen.controller;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import studio.gnosticdeveloper.bonusbissen.dto.request.StorefrontCreateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.StorefrontUpdateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.StorefrontResponse;
import studio.gnosticdeveloper.bonusbissen.security.AuthenticatedPrincipal;
import studio.gnosticdeveloper.bonusbissen.service.StorefrontService;

@RestController
@RequestMapping("/storefronts")
@PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
public class StorefrontController {

    private final StorefrontService storefrontService;

    public StorefrontController(StorefrontService storefrontService) {
        this.storefrontService = storefrontService;
    }

    @GetMapping
    public List<StorefrontResponse> list(@AuthenticationPrincipal AuthenticatedPrincipal principal) {
        return storefrontService.listByOrganization(principal.organizationId()).stream().map(StorefrontResponse::from).toList();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public StorefrontResponse create(
        @Valid @RequestBody StorefrontCreateRequest request,
        @AuthenticationPrincipal AuthenticatedPrincipal principal
    ) {
        return StorefrontResponse.from(storefrontService.create(request, principal.organizationId()));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public StorefrontResponse update(
        @PathVariable UUID id,
        @Valid @RequestBody StorefrontUpdateRequest request,
        @AuthenticationPrincipal AuthenticatedPrincipal principal
    ) {
        return StorefrontResponse.from(storefrontService.update(id, request, principal.organizationId()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id, @AuthenticationPrincipal AuthenticatedPrincipal principal) {
        storefrontService.deactivate(id, principal.organizationId());
    }
}
