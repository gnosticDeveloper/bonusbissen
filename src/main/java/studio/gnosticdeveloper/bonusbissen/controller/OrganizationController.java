package studio.gnosticdeveloper.bonusbissen.controller;

import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;

import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import studio.gnosticdeveloper.bonusbissen.dto.request.OrganizationUpdateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.OrganizationResponse;
import studio.gnosticdeveloper.bonusbissen.security.AuthenticatedPrincipal;
import studio.gnosticdeveloper.bonusbissen.service.AccountMediaService;
import studio.gnosticdeveloper.bonusbissen.service.OrganizationService;
import studio.gnosticdeveloper.bonusbissen.storage.StorageService;

@RestController
@RequestMapping("/organization")
@PreAuthorize("hasAnyRole('CASHIER', 'ADMIN')")
public class OrganizationController {

    private final OrganizationService organizationService;
    private final AccountMediaService accountMediaService;
    private final StorageService storageService;

    public OrganizationController(OrganizationService organizationService, AccountMediaService accountMediaService, StorageService storageService) {
        this.organizationService = organizationService;
        this.accountMediaService = accountMediaService;
        this.storageService = storageService;
    }

    @GetMapping
    public OrganizationResponse get(@AuthenticationPrincipal AuthenticatedPrincipal principal) {
        return OrganizationResponse.from(organizationService.getById(principal.organizationId()), storageService);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public OrganizationResponse update(@Valid @RequestBody OrganizationUpdateRequest request, @AuthenticationPrincipal AuthenticatedPrincipal principal) {
        return OrganizationResponse.from(organizationService.update(principal.organizationId(), request), storageService);
    }

    @PostMapping(path = "/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public OrganizationResponse uploadLogo(@RequestPart(value = "image", required = false) MultipartFile image, @AuthenticationPrincipal AuthenticatedPrincipal principal) {
        return OrganizationResponse.from(accountMediaService.setLogo(principal.organizationId(), image), storageService);
    }

    @DeleteMapping("/logo")
    @PreAuthorize("hasRole('ADMIN')")
    public OrganizationResponse deleteLogo(@AuthenticationPrincipal AuthenticatedPrincipal principal) {
        return OrganizationResponse.from(accountMediaService.removeLogo(principal.organizationId()), storageService);
    }

    @PostMapping(path = "/banner", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public OrganizationResponse uploadBanner(@RequestPart(value = "image", required = false) MultipartFile image, @AuthenticationPrincipal AuthenticatedPrincipal principal) {
        return OrganizationResponse.from(accountMediaService.setBanner(principal.organizationId(), image), storageService);
    }

    @DeleteMapping("/banner")
    @PreAuthorize("hasRole('ADMIN')")
    public OrganizationResponse deleteBanner(@AuthenticationPrincipal AuthenticatedPrincipal principal) {
        return OrganizationResponse.from(accountMediaService.removeBanner(principal.organizationId()), storageService);
    }
}
