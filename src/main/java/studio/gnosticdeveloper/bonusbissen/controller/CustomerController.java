package studio.gnosticdeveloper.bonusbissen.controller;

import studio.gnosticdeveloper.bonusbissen.dto.request.CustomerCreateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.CustomerPointsResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.CustomerResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.PointTransactionResponse;
import studio.gnosticdeveloper.bonusbissen.entity.Customer;
import studio.gnosticdeveloper.bonusbissen.service.CustomerService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

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

    @GetMapping("/{document}/points")
    public CustomerPointsResponse getPoints(@PathVariable String document) {
        Customer customer = customerService.getByDocument(document);
        int totalPoints = customerService.getBalance(customer.getId());
        return new CustomerPointsResponse(customer.getDocument(), customer.getName(), totalPoints);
    }

    @GetMapping("/{document}/transactions")
    public Page<PointTransactionResponse> getTransactions(@PathVariable String document, Pageable pageable) {
        return customerService.getTransactions(document, pageable)
                .map(tx -> PointTransactionResponse.from(tx, null));
    }
}
