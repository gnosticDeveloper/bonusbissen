package studio.gnosticdeveloper.bonusbissen.controller;

import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import studio.gnosticdeveloper.bonusbissen.dto.response.TraceabilityLogResponse;
import studio.gnosticdeveloper.bonusbissen.security.AuthenticatedPrincipal;
import studio.gnosticdeveloper.bonusbissen.service.TraceabilityService;

@RestController
@RequestMapping("/traceability")
@PreAuthorize("hasRole('ADMIN')")
public class TraceabilityController {

    private final TraceabilityService traceabilityService;

    public TraceabilityController(TraceabilityService traceabilityService) {
        this.traceabilityService = traceabilityService;
    }

    /** Exactly one of operationId, originatingUserId or affectedUserId must be given; results are limited to the admin's own organization. */
    @GetMapping
    public List<TraceabilityLogResponse> find(
        @RequestParam(required = false) UUID operationId,
        @RequestParam(required = false) UUID originatingUserId,
        @RequestParam(required = false) UUID affectedUserId,
        @AuthenticationPrincipal AuthenticatedPrincipal principal
    ) {
        return traceabilityService.findForOrganization(operationId, originatingUserId, affectedUserId, principal.organizationId());
    }
}
