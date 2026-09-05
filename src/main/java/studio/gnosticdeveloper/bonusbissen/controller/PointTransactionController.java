package studio.gnosticdeveloper.bonusbissen.controller;

import studio.gnosticdeveloper.bonusbissen.dto.request.ApproveExchangeRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.CancelExchangeRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.UserCancelExchangeRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.ExchangeVerifyRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.ExchangeResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.PendingExchangeResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.PendingExchangeReviewResponse;
import studio.gnosticdeveloper.bonusbissen.entity.TransactionState;
import studio.gnosticdeveloper.bonusbissen.security.AuthenticatedPrincipal;
import studio.gnosticdeveloper.bonusbissen.service.PointTransactionService;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
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
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public List<ExchangeResponse> getAllExchanges(@AuthenticationPrincipal AuthenticatedPrincipal principal) {
        return pointTransactionService.getAll(principal.organizationId());
    }

    @GetMapping("/resolved")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public List<ExchangeResponse> getResolvedExchanges(Pageable pageable, @AuthenticationPrincipal AuthenticatedPrincipal principal) {
        return pointTransactionService.getResolved(principal.organizationId(), pageable);
    }

    @GetMapping("/pending/{id}")
    public List<PendingExchangeResponse> getAllPendingExchangesByUserId(@PathVariable UUID id, @AuthenticationPrincipal AuthenticatedPrincipal principal) {
        if ("USER".equals(principal.role()) && !principal.id().equals(id)) {
            throw new AccessDeniedException("No podés acceder a los canjes de otro cliente.");
        }
        return pointTransactionService.getAllPendingExchangesById(id);
    }

    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public List<PendingExchangeReviewResponse> getAllPendingExchanges(@AuthenticationPrincipal AuthenticatedPrincipal principal) {
        return pointTransactionService.getAllByState(TransactionState.PENDING, principal.organizationId());
    }

    @GetMapping("/pending-count")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public int getPendingExchangesCount(@AuthenticationPrincipal AuthenticatedPrincipal principal) {
        return pointTransactionService.countByState(TransactionState.PENDING, principal.organizationId());
    }

    @PostMapping("/verify")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public ExchangeResponse verifyExchange(@RequestBody ExchangeVerifyRequest request, @AuthenticationPrincipal AuthenticatedPrincipal principal) {
        return pointTransactionService.verifyExchange(request.code(), principal.organizationId());
    }

    @PostMapping("/cancel")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    @ResponseStatus(code = HttpStatus.OK)
    public void cancelExchange(@RequestBody CancelExchangeRequest request, @AuthenticationPrincipal AuthenticatedPrincipal principal) {
        pointTransactionService.cancelExchange(request, principal.organizationId());
    }

    @PostMapping("/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    @ResponseStatus(code = HttpStatus.OK)
    public void approveExchange(@RequestBody ApproveExchangeRequest request, @AuthenticationPrincipal AuthenticatedPrincipal principal) {
        pointTransactionService.approveExchange(request, principal.organizationId());
    }

    @PostMapping("/user-cancel")
    @PreAuthorize("hasRole('USER')")
    @ResponseStatus(code = HttpStatus.OK)
    public void userCancelExchange(@RequestBody UserCancelExchangeRequest request, @AuthenticationPrincipal AuthenticatedPrincipal principal) {
        pointTransactionService.userCancelExchange(request, principal.id());
    }
}
