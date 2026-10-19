package studio.gnosticdeveloper.bonusbissen.controller;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import studio.gnosticdeveloper.bonusbissen.dto.request.OrganizationBillingInfoRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.OrganizationBillingPlanRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.OrganizationUpdateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.BillingPlanResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.InvoiceResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.OrganizationResponse;
import studio.gnosticdeveloper.bonusbissen.security.AuthenticatedPrincipal;
import studio.gnosticdeveloper.bonusbissen.service.AccountMediaService;
import studio.gnosticdeveloper.bonusbissen.service.InvoiceService;
import studio.gnosticdeveloper.bonusbissen.service.OrganizationService;
import studio.gnosticdeveloper.bonusbissen.storage.StorageService;

@RestController
@RequestMapping("/organization")
public class OrganizationController {

    private final OrganizationService organizationService;
    private final AccountMediaService accountMediaService;
    private final StorageService storageService;
    private final InvoiceService invoiceService;

    public OrganizationController(
        OrganizationService organizationService,
        AccountMediaService accountMediaService,
        StorageService storageService,
        InvoiceService invoiceService
    ) {
        this.organizationService = organizationService;
        this.accountMediaService = accountMediaService;
        this.storageService = storageService;
        this.invoiceService = invoiceService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('CASHIER', 'ADMIN')")
    public OrganizationResponse get(@AuthenticationPrincipal AuthenticatedPrincipal principal) {
        return OrganizationResponse.from(organizationService.getById(principal.organizationId()), storageService);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public OrganizationResponse update(@Valid @RequestBody OrganizationUpdateRequest request, @AuthenticationPrincipal AuthenticatedPrincipal principal) {
        return OrganizationResponse.from(organizationService.update(principal.organizationId(), request), storageService);
    }

    @DeleteMapping
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal AuthenticatedPrincipal principal) {
        organizationService.deactivate(principal.organizationId());
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

    /** Fiscal/billing self-reported data. Partial: a field left out of the body keeps its current value. */
    @PatchMapping("/billing-info")
    @PreAuthorize("hasRole('ADMIN')")
    public OrganizationResponse updateBillingInfo(@RequestBody OrganizationBillingInfoRequest request, @AuthenticationPrincipal AuthenticatedPrincipal principal) {
        return OrganizationResponse.from(organizationService.updateBillingInfo(principal.organizationId(), request), storageService);
    }

    @GetMapping("/billing-plans")
    @PreAuthorize("hasRole('ADMIN')")
    public List<BillingPlanResponse> listBillingPlans() {
        return organizationService.listActiveBillingPlans().stream().map(BillingPlanResponse::from).toList();
    }

    /** Self-service: the org picks (or changes) its own plan and billing cycle. */
    @PutMapping("/billing-plan")
    @PreAuthorize("hasRole('ADMIN')")
    public OrganizationResponse selectBillingPlan(@Valid @RequestBody OrganizationBillingPlanRequest request, @AuthenticationPrincipal AuthenticatedPrincipal principal) {
        return OrganizationResponse.from(organizationService.selectBillingPlan(principal.organizationId(), request), storageService);
    }

    @GetMapping("/invoices")
    @PreAuthorize("hasRole('ADMIN')")
    public List<InvoiceResponse> listInvoices(@AuthenticationPrincipal AuthenticatedPrincipal principal) {
        return invoiceService.listForOrganization(principal.organizationId()).stream().map(InvoiceResponse::from).toList();
    }

    @GetMapping("/invoices/{invoiceId}/pdf")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<byte[]> downloadInvoice(@PathVariable UUID invoiceId, @AuthenticationPrincipal AuthenticatedPrincipal principal) {
        byte[] pdf = invoiceService.getPdf(principal.organizationId(), invoiceId);
        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_PDF)
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=factura-" + invoiceId + ".pdf")
            .body(pdf);
    }
}
