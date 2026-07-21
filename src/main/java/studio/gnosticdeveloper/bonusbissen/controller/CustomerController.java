package studio.gnosticdeveloper.bonusbissen.controller;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import studio.gnosticdeveloper.bonusbissen.dto.request.ClaimRewardRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.CustomerCreateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.GrantPointsRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.CustomerPointsAwardResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.CustomerPointsResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.CustomerResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.HistoricalExchangeResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.MovementResponse;
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

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteById(@PathVariable UUID id) {
        // Note: perhaps should be better to also validate a token in this endpoint. For now, anyone can delete a customer.
        customerService.deleteById(id);
    }

    @GetMapping("/{id}")
    public CustomerPointsResponse getById(@PathVariable UUID id) {
        // TODO: needs to be implemented. getById should return a Customer.
        // Should be tested before final implementation.
        return customerService.getCustomerPointsById(id);
    }

    @GetMapping("/phone/{phone}")
    public CustomerPointsResponse getByPhone(@PathVariable String phone) {
        // TODO: needs to be implemented. getById should return a Customer.
        // Should be tested before final implementation.
        return customerService.getCustomerPointsByPhone(phone);
    }

    @PostMapping("/grant")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public CustomerPointsAwardResponse grantPoints(@Valid @RequestBody GrantPointsRequest request) {
        return customerService.grantPoints(request);
    }

    @GetMapping("/{id}/exchanges")
    public List<HistoricalExchangeResponse> getHistoricalExchanges(@PathVariable UUID id) {
        return customerService.getHistoricalExchangesByCustomerId(id);
    }

    @GetMapping("/{id}/movements")
    public List<MovementResponse> getMovementsHistory(@PathVariable UUID id) {
        return customerService.getMovementsByCustomerId(id);
    }

    /**
     * Claim a reward for the customer
     *
     * @param request The information needed to create a record on both the exchanges table and the exchange_codes table
     * @return The code of the reward that was claimed.
     */
    @PostMapping("/claim-reward")
    public String claimReward(@Valid @RequestBody ClaimRewardRequest request) {
        // TODO: implement this method. See the Javadoc above.
        return customerService.claimReward(request);
    }
}
