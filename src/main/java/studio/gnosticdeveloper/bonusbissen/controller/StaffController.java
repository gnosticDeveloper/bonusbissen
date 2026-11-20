package studio.gnosticdeveloper.bonusbissen.controller;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import studio.gnosticdeveloper.bonusbissen.dto.request.AttachStorefrontsRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.StaffCreateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.StaffUpdateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.StaffResponse;
import studio.gnosticdeveloper.bonusbissen.security.AuthenticatedPrincipal;
import studio.gnosticdeveloper.bonusbissen.service.StaffService;

@RestController
@RequestMapping("/staff")
@PreAuthorize("hasRole('ADMIN')")
public class StaffController {

    private final StaffService staffService;

    public StaffController(StaffService staffService) {
        this.staffService = staffService;
    }

    @GetMapping
    public List<StaffResponse> list(@AuthenticationPrincipal AuthenticatedPrincipal principal) {
        return staffService.listByOrganization(principal.organizationId()).stream().map(StaffResponse::from).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public StaffResponse create(@Valid @RequestBody StaffCreateRequest request, @AuthenticationPrincipal AuthenticatedPrincipal principal) {
        return StaffResponse.from(staffService.create(request, principal.organizationId(), principal.id()));
    }

    @PostMapping("/{id}/storefronts")
    public StaffResponse attachStorefronts(
        @PathVariable UUID id,
        @Valid @RequestBody AttachStorefrontsRequest request,
        @AuthenticationPrincipal AuthenticatedPrincipal principal
    ) {
        return StaffResponse.from(staffService.attachStorefronts(id, request.storefrontIds(), principal.organizationId(), principal.id()));
    }

    @DeleteMapping("/{id}/storefronts")
    public StaffResponse detachStorefronts(
        @PathVariable UUID id,
        @Valid @RequestBody AttachStorefrontsRequest request,
        @AuthenticationPrincipal AuthenticatedPrincipal principal
    ) {
        return StaffResponse.from(staffService.detachStorefronts(id, request.storefrontIds(), principal.organizationId(), principal.id()));
    }

    /** Changes a staff member's role. Their sessions are revoked so tokens carrying the old role stop working. */
    @PatchMapping("/{id}")
    public StaffResponse updateRole(
        @PathVariable UUID id,
        @Valid @RequestBody StaffUpdateRequest request,
        @AuthenticationPrincipal AuthenticatedPrincipal principal
    ) {
        return StaffResponse.from(staffService.updateRole(id, request, principal.organizationId(), principal.id()));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deactivate(@PathVariable UUID id, @AuthenticationPrincipal AuthenticatedPrincipal principal) {
        staffService.deactivate(id, principal.organizationId(), principal.id());
    }

    /** Kills a staff member's sessions without deactivating them (e.g. suspected account compromise). */
    @PostMapping("/{id}/sessions/revoke")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revokeSessions(@PathVariable UUID id, @AuthenticationPrincipal AuthenticatedPrincipal principal) {
        staffService.revokeSessions(id, principal.organizationId(), principal.id());
    }
}
