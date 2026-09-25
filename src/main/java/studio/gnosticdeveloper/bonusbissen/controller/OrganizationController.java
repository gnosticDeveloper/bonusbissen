package studio.gnosticdeveloper.bonusbissen.controller;

import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import studio.gnosticdeveloper.bonusbissen.dto.request.OrganizationUpdateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.OrganizationResponse;
import studio.gnosticdeveloper.bonusbissen.security.AuthenticatedPrincipal;
import studio.gnosticdeveloper.bonusbissen.service.OrganizationService;

@RestController
@RequestMapping("/organization")
@PreAuthorize("hasAnyRole('CASHIER', 'ADMIN')")
public class OrganizationController {

    private final OrganizationService organizationService;

    public OrganizationController(OrganizationService organizationService) {
        this.organizationService = organizationService;
    }

    @GetMapping
    public OrganizationResponse get(@AuthenticationPrincipal AuthenticatedPrincipal principal) {
        return OrganizationResponse.from(organizationService.getById(principal.organizationId()));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public OrganizationResponse update(@Valid @RequestBody OrganizationUpdateRequest request, @AuthenticationPrincipal AuthenticatedPrincipal principal) {
        return OrganizationResponse.from(organizationService.update(principal.organizationId(), request));
    }
}
