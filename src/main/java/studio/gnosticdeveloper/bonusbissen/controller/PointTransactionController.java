package studio.gnosticdeveloper.bonusbissen.controller;

import studio.gnosticdeveloper.bonusbissen.dto.request.ApproveExchangeRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.CancelExchangeRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.CustomerCancelExchangeRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.ExchangeVerifyRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.ExchangeResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.PendingExchangeResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.PendingExchangeReviewResponse;
import studio.gnosticdeveloper.bonusbissen.entity.TransactionState;
import studio.gnosticdeveloper.bonusbissen.security.AuthenticatedPrincipal;
import studio.gnosticdeveloper.bonusbissen.service.PointTransactionService;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/exchanges")
public class PointTransactionController {

    private final PointTransactionService pointTransactionService;

    public PointTransactionController(PointTransactionService pointTransactionService) {
        this.pointTransactionService = pointTransactionService;
    }

    @GetMapping
    public List<ExchangeResponse> getAllExchanges() {
        return pointTransactionService.getAll();
    }

    @GetMapping("/pending/{id}")
    public List<PendingExchangeResponse> getAllPendingExchangesByCustomerId(@PathVariable UUID id) {
        return pointTransactionService.getAllPendingExchangesById(id);
    }

    @GetMapping("/pending")
    public List<PendingExchangeReviewResponse> getAllPendingExchanges() {
        return pointTransactionService.getAllByState(TransactionState.PENDING);
    }

    @GetMapping("/pending-count")
    public int getPendingExchangesCount() {
        return pointTransactionService.countByState(TransactionState.PENDING);
    }

    @PostMapping("/verify")
    public ExchangeResponse verifyExchange(@RequestBody ExchangeVerifyRequest request) {
        return pointTransactionService.verifyExchange(request.code());
    }

    @PostMapping("/cancel")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    @ResponseStatus(code = HttpStatus.OK)
    public void cancelExchange(@RequestBody CancelExchangeRequest request) {
        pointTransactionService.cancelExchange(request);
    }

    @PostMapping("/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    @ResponseStatus(code = HttpStatus.OK)
    public void approveExchange(@RequestBody ApproveExchangeRequest request) {
        pointTransactionService.approveExchange(request);
    }

    @PostMapping("/customer-cancel")
    @PreAuthorize("hasRole('CUSTOMER')")
    @ResponseStatus(code = HttpStatus.OK)
    public void customerCancelExchange(@RequestBody CustomerCancelExchangeRequest request, @AuthenticationPrincipal AuthenticatedPrincipal principal) {
        pointTransactionService.customerCancelExchange(request, principal.id());
    }
}
