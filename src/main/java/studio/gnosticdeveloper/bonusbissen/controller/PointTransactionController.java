package studio.gnosticdeveloper.bonusbissen.controller;

import studio.gnosticdeveloper.bonusbissen.dto.request.CancelExchangeRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.ExchangeVerifyRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.ExchangeResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.PendingExchangeResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.PendingExchangeReviewResponse;
import studio.gnosticdeveloper.bonusbissen.entity.PointTransaction;
import studio.gnosticdeveloper.bonusbissen.entity.TransactionState;
import studio.gnosticdeveloper.bonusbissen.service.PointTransactionService;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
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
        // TODO: apparently this method does not work and throws an exception.
        // Note: All exchange methods cannot be tested properly since there's no real customer login; hence, a customer cannot create exchanges.
        return pointTransactionService.getAll().stream().map(ExchangeResponse::from).toList();
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
    @ResponseStatus(code = HttpStatus.OK)
    public void cancelExchange(@RequestBody CancelExchangeRequest request) {
        pointTransactionService.cancelExchange(request);
    }
}
