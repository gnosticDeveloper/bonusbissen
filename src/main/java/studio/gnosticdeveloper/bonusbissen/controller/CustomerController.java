package studio.gnosticdeveloper.bonusbissen.controller;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import studio.gnosticdeveloper.bonusbissen.dto.request.ClaimRewardRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.CustomerCreateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.CustomerUpdateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.GrantPointsRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.GrantPointsUpdateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.CustomerPointsAwardResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.CustomerPointsResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.CustomerResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.HistoricalExchangeResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.MovementResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.PagedResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.PointActionResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.TopClientResponse;
import studio.gnosticdeveloper.bonusbissen.entity.Customer;
import studio.gnosticdeveloper.bonusbissen.security.AuthenticatedPrincipal;
import studio.gnosticdeveloper.bonusbissen.service.CustomerService;

@RestController
@RequestMapping("/customers")
public class CustomerController {

    private final CustomerService customerService;

    public CustomerController(CustomerService customerService) {
        this.customerService = customerService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    @ResponseStatus(HttpStatus.CREATED)
    public CustomerResponse create(@Valid @RequestBody CustomerCreateRequest request, @AuthenticationPrincipal AuthenticatedPrincipal principal) {
        return CustomerResponse.from(customerService.create(request, principal.id()));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('CASHIER', 'ADMIN')")
    public PagedResponse<CustomerPointsResponse> search(@RequestParam(required = false) String search, Pageable pageable) {
        return PagedResponse.from(customerService.search(search, pageable));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public CustomerResponse update(@PathVariable UUID id, @Valid @RequestBody CustomerUpdateRequest request) {
        return CustomerResponse.from(customerService.update(id, request));
    }

    @PatchMapping("/{id}/reactivate")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public CustomerResponse reactivate(@PathVariable UUID id) {
        return CustomerResponse.from(customerService.reactivate(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CUSTOMER')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteById(@PathVariable UUID id, @AuthenticationPrincipal AuthenticatedPrincipal principal) {
        requireSelfIfCustomer(id, principal);
        customerService.deleteById(id);
    }

    @GetMapping("/{id}")
    public CustomerPointsResponse getById(@PathVariable UUID id, @AuthenticationPrincipal AuthenticatedPrincipal principal) {
        requireSelfIfCustomer(id, principal);
        return customerService.getCustomerPointsById(id);
    }

    @GetMapping("/phone/{phone}")
    public CustomerPointsResponse getByPhone(@PathVariable String phone) {
        return customerService.getCustomerPointsByPhone(phone);
    }

    @PostMapping("/grant")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public CustomerPointsAwardResponse grantPoints(@Valid @RequestBody GrantPointsRequest request, @AuthenticationPrincipal AuthenticatedPrincipal principal) {
        return customerService.grantPoints(request, principal.id());
    }

    @GetMapping("/grant/history")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public List<PointActionResponse> getGrantHistory(
        @RequestParam(defaultValue = "10") int size,
        @RequestParam(name = "of", required = false) UUID of,
        @AuthenticationPrincipal AuthenticatedPrincipal principal
    ) {
        return customerService.getGrantHistory(principal.organizationId(), of, size);
    }

    @PatchMapping("/grant/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public PointActionResponse updateGrant(
        @PathVariable UUID id,
        @Valid @RequestBody GrantPointsUpdateRequest request,
        @AuthenticationPrincipal AuthenticatedPrincipal principal
    ) {
        return customerService.updateGrant(id, request, principal.organizationId());
    }

    @DeleteMapping("/grant/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteGrant(@PathVariable UUID id, @AuthenticationPrincipal AuthenticatedPrincipal principal) {
        customerService.deleteGrant(id, principal.organizationId());
    }

    @GetMapping("/{id}/exchanges")
    public List<HistoricalExchangeResponse> getHistoricalExchanges(@PathVariable UUID id, @AuthenticationPrincipal AuthenticatedPrincipal principal) {
        requireSelfIfCustomer(id, principal);
        return customerService.getHistoricalExchangesByCustomerId(id);
    }

    @GetMapping("/{id}/movements")
    public List<MovementResponse> getMovementsHistory(@PathVariable UUID id, @AuthenticationPrincipal AuthenticatedPrincipal principal) {
        requireSelfIfCustomer(id, principal);
        return customerService.getMovementsByCustomerId(id);
    }

    private void requireSelfIfCustomer(UUID id, AuthenticatedPrincipal principal) {
        if ("CUSTOMER".equals(principal.role()) && !principal.id().equals(id)) {
            throw new AccessDeniedException("No podés acceder a los datos de otro cliente.");
        }
    }

    @GetMapping("/top")
    @PreAuthorize("hasAnyRole('CASHIER', 'ADMIN')")
    public List<TopClientResponse> getTopClients(@AuthenticationPrincipal AuthenticatedPrincipal principal) {
        return customerService.getTopClients(principal.organizationId());
    }

    /**
     * Claim a reward for the customer
     *
     * @param request The information needed to create a record on both the exchanges table and the exchange_codes table
     * @return The code of the reward that was claimed.
     */
    @PostMapping("/claim-reward")
    @PreAuthorize("hasRole('CUSTOMER')")
    public String claimReward(@Valid @RequestBody ClaimRewardRequest request, @AuthenticationPrincipal AuthenticatedPrincipal principal) {
        if (!principal.id().equals(request.customerId())) {
            throw new AccessDeniedException("No podés canjear recompensas en nombre de otro cliente.");
        }
        return customerService.claimReward(request);
    }
}
