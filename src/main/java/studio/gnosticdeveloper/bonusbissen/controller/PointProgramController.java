package studio.gnosticdeveloper.bonusbissen.controller;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import studio.gnosticdeveloper.bonusbissen.dto.request.AttachStorefrontsRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.JoinPointProgramRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.PointProgramCreateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.PointProgramUpdateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.PointProgramResponse;
import studio.gnosticdeveloper.bonusbissen.security.AuthenticatedPrincipal;
import studio.gnosticdeveloper.bonusbissen.service.PointProgramService;

@RestController
@RequestMapping("/point-programs")
@PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
public class PointProgramController {

    private final PointProgramService pointProgramService;

    public PointProgramController(PointProgramService pointProgramService) {
        this.pointProgramService = pointProgramService;
    }

    @GetMapping
    public List<PointProgramResponse> list(@AuthenticationPrincipal AuthenticatedPrincipal principal) {
        return pointProgramService.listByOrganization(principal.organizationId()).stream().map(PointProgramResponse::from).toList();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public PointProgramResponse create(
        @Valid @RequestBody PointProgramCreateRequest request,
        @AuthenticationPrincipal AuthenticatedPrincipal principal
    ) {
        return PointProgramResponse.from(pointProgramService.create(request, principal.organizationId()));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public PointProgramResponse update(
        @PathVariable UUID id,
        @Valid @RequestBody PointProgramUpdateRequest request,
        @AuthenticationPrincipal AuthenticatedPrincipal principal
    ) {
        return PointProgramResponse.from(pointProgramService.update(id, request, principal.organizationId()));
    }

    @PostMapping("/{id}/storefronts")
    @PreAuthorize("hasRole('ADMIN')")
    public PointProgramResponse attachStorefronts(
        @PathVariable UUID id,
        @Valid @RequestBody AttachStorefrontsRequest request,
        @AuthenticationPrincipal AuthenticatedPrincipal principal
    ) {
        return PointProgramResponse.from(pointProgramService.attachStorefronts(id, request.storefrontIds(), principal.organizationId()));
    }

    /** Staff joining a user to this program on their behalf (e.g. a walk-in at the register). */
    @PostMapping("/{id}/members")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void joinMember(
        @PathVariable UUID id,
        @Valid @RequestBody JoinPointProgramRequest request,
        @AuthenticationPrincipal AuthenticatedPrincipal principal
    ) {
        pointProgramService.joinOnBehalf(request.userId(), id, principal.organizationId());
    }

    @DeleteMapping("/{id}/storefronts")
    @PreAuthorize("hasRole('ADMIN')")
    public PointProgramResponse detachStorefronts(
        @PathVariable UUID id,
        @Valid @RequestBody AttachStorefrontsRequest request,
        @AuthenticationPrincipal AuthenticatedPrincipal principal
    ) {
        return PointProgramResponse.from(pointProgramService.detachStorefronts(id, request.storefrontIds(), principal.organizationId()));
    }
}
