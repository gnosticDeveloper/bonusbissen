package studio.gnosticdeveloper.bonusbissen.controller;

import studio.gnosticdeveloper.bonusbissen.dto.request.PointTransactionCreateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.PointTransactionResponse;
import studio.gnosticdeveloper.bonusbissen.security.EmployeePrincipal;
import studio.gnosticdeveloper.bonusbissen.service.PointTransactionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/point-transactions")
public class PointTransactionController {

    private final PointTransactionService pointTransactionService;

    public PointTransactionController(PointTransactionService pointTransactionService) {
        this.pointTransactionService = pointTransactionService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PointTransactionResponse create(@Valid @RequestBody PointTransactionCreateRequest request, Authentication authentication) {
        EmployeePrincipal principal = (EmployeePrincipal) authentication.getPrincipal();
        PointTransactionService.Result result = pointTransactionService.create(request, principal.getEmployeeId());
        return PointTransactionResponse.from(result.transaction(), result.newBalance());
    }
}
