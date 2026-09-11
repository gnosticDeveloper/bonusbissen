package studio.gnosticdeveloper.bonusbissen.controller;

import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import studio.gnosticdeveloper.bonusbissen.dto.response.BusinessResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.CityOption;
import studio.gnosticdeveloper.bonusbissen.dto.response.PagedResponse;
import studio.gnosticdeveloper.bonusbissen.security.AuthenticatedPrincipal;
import studio.gnosticdeveloper.bonusbissen.service.DiscoveryService;

/** Public; a user token is optional and, when present, adds the viewer's balance. */
@RestController
@RequestMapping("/discover")
public class DiscoveryController {

    private final DiscoveryService discoveryService;

    public DiscoveryController(DiscoveryService discoveryService) {
        this.discoveryService = discoveryService;
    }

    @GetMapping("/storefronts")
    public PagedResponse<BusinessResponse> storefronts(
        @RequestParam(required = false) String city,
        Pageable pageable,
        @AuthenticationPrincipal AuthenticatedPrincipal principal
    ) {
        UUID viewer = principal != null && "USER".equals(principal.role()) ? principal.id() : null;
        return discoveryService.discover(city, viewer, pageable);
    }

    @GetMapping("/cities")
    public List<CityOption> cities() {
        return discoveryService.cities();
    }
}
