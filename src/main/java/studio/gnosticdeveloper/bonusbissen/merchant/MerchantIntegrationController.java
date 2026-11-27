package studio.gnosticdeveloper.bonusbissen.merchant;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import studio.gnosticdeveloper.bonusbissen.security.AuthenticatedPrincipal;

@RestController
@RequestMapping("/integrations")
@PreAuthorize("hasRole('ADMIN')")
public class MerchantIntegrationController {

    private final MerchantIntegrationService service;

    public MerchantIntegrationController(MerchantIntegrationService service) {
        this.service = service;
    }

    /** The only response that ever contains the signing secret. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public IntegrationResponse create(@Valid @RequestBody IntegrationCreateRequest request, @AuthenticationPrincipal AuthenticatedPrincipal principal) {
        return service.create(request, principal.organizationId());
    }

    @GetMapping
    public List<IntegrationResponse> list(@AuthenticationPrincipal AuthenticatedPrincipal principal) {
        return service.list(principal.organizationId());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deactivate(@PathVariable UUID id, @AuthenticationPrincipal AuthenticatedPrincipal principal) {
        service.deactivate(id, principal.organizationId());
    }
}
