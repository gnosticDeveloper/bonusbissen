package studio.gnosticdeveloper.bonusbissen.controller;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import studio.gnosticdeveloper.bonusbissen.dto.request.ClaimRewardRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.CustomerCreateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.GrantPointsRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.CustomerPointsAwardResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.CustomerPointsResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.CustomerResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.HistoricalExchangeResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.MovementResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.TopClientResponse;
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
    @ResponseStatus(HttpStatus.CREATED)
    public CustomerResponse create(@Valid @RequestBody CustomerCreateRequest request) {
        return CustomerResponse.from(customerService.create(request));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('CASHIER', 'ADMIN')")
    public Page<CustomerResponse> search(@RequestParam(required = false) String search, Pageable pageable) {
        return customerService.search(search, pageable);
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
    public CustomerPointsAwardResponse grantPoints(@Valid @RequestBody GrantPointsRequest request) {
        return customerService.grantPoints(request);
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
    public List<TopClientResponse> getTopClients() {
        return customerService.getTopClients();
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
