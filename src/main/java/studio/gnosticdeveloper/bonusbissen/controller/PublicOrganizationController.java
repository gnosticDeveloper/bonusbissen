package studio.gnosticdeveloper.bonusbissen.controller;

import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import studio.gnosticdeveloper.bonusbissen.dto.request.OrganizationCreateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.OrganizationOption;
import studio.gnosticdeveloper.bonusbissen.dto.response.OrganizationResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.PagedResponse;
import studio.gnosticdeveloper.bonusbissen.security.AuthenticatedPrincipal;
import studio.gnosticdeveloper.bonusbissen.service.OrganizationService;
import studio.gnosticdeveloper.bonusbissen.storage.StorageService;

@RestController
@RequestMapping("/organizations")
public class PublicOrganizationController {

    private final OrganizationService organizationService;
    private final StorageService storageService;

    public PublicOrganizationController(OrganizationService organizationService, StorageService storageService) {
        this.organizationService = organizationService;
        this.storageService = storageService;
    }

    @PostMapping
    @PreAuthorize("hasRole('USER')")
    @ResponseStatus(HttpStatus.CREATED)
    public OrganizationResponse create(@Valid @RequestBody OrganizationCreateRequest request, @AuthenticationPrincipal AuthenticatedPrincipal principal) {
        return OrganizationResponse.from(organizationService.create(request, principal.id()), storageService);
    }

    @GetMapping
    public PagedResponse<OrganizationOption> search(@RequestParam(required = false) String search, Pageable pageable) {
        return PagedResponse.from(organizationService.search(search, pageable).map(OrganizationOption::from));
    }
}
