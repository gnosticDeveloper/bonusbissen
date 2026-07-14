package studio.gnosticdeveloper.bonusbissen.controller;

import studio.gnosticdeveloper.bonusbissen.dto.response.PendingExchangeResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.PendingExchangeReviewResponse;
import studio.gnosticdeveloper.bonusbissen.service.PointTransactionService;

import java.util.List;
import java.util.UUID;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/exchanges")
public class ExchangeController {

    private final PointTransactionService exchangesService;

    public ExchangeController(PointTransactionService exchangesService) {
        this.exchangesService = exchangesService;
    }

    @GetMapping("/pending/{id}")
    public List<PendingExchangeResponse> getAllPendingExchangesByCustomerId(@PathVariable UUID id) {
        // TODO: to be implemented.
        return exchangesService.getAllPendingExchangesById(id);
    }

    @GetMapping("/pending")
    public List<PendingExchangeReviewResponse> getAllPendingExchanges() {
        // TODO: to be implemented.
        return exchangesService.getAllByState("pending");
    }

    @GetMapping("/pending-count")
    public int getPendingExchangesCount() {
        // TODO: to be implemented.
        return exchangesService.countByState("pending");
    }
}
