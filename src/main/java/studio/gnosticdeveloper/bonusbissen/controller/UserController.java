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
import studio.gnosticdeveloper.bonusbissen.dto.request.UserUpdateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.GrantPointsRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.GrantPointsUpdateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.UserPointsAwardResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.UserPointsResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.UserResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.HistoricalExchangeResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.MovementResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.PagedResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.PointActionResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.TopClientResponse;
import studio.gnosticdeveloper.bonusbissen.security.AuthenticatedPrincipal;
import studio.gnosticdeveloper.bonusbissen.service.UserService;

@RestController
@RequestMapping("/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('CASHIER', 'ADMIN')")
    public PagedResponse<UserPointsResponse> search(@RequestParam(required = false) String search, Pageable pageable) {
        return PagedResponse.from(userService.search(search, pageable));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public UserResponse update(@PathVariable UUID id, @Valid @RequestBody UserUpdateRequest request) {
        return UserResponse.from(userService.update(id, request));
    }

    @PatchMapping("/{id}/reactivate")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public UserResponse reactivate(@PathVariable UUID id) {
        return UserResponse.from(userService.reactivate(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteById(@PathVariable UUID id, @AuthenticationPrincipal AuthenticatedPrincipal principal) {
        requireSelfIfUser(id, principal);
        userService.deleteById(id);
    }

    @GetMapping("/{id}")
    public UserPointsResponse getById(@PathVariable UUID id, @AuthenticationPrincipal AuthenticatedPrincipal principal) {
        requireSelfIfUser(id, principal);
        return userService.getUserPointsById(id);
    }

    @PostMapping("/grant")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public UserPointsAwardResponse grantPoints(@Valid @RequestBody GrantPointsRequest request, @AuthenticationPrincipal AuthenticatedPrincipal principal) {
        return userService.grantPoints(request, principal.id());
    }

    @GetMapping("/grant/history")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public List<PointActionResponse> getGrantHistory(
        @RequestParam(defaultValue = "10") int size,
        @RequestParam(name = "of", required = false) UUID of,
        @AuthenticationPrincipal AuthenticatedPrincipal principal
    ) {
        return userService.getGrantHistory(principal.organizationId(), of, size);
    }

    @PatchMapping("/grant/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public PointActionResponse updateGrant(
        @PathVariable UUID id,
        @Valid @RequestBody GrantPointsUpdateRequest request,
        @AuthenticationPrincipal AuthenticatedPrincipal principal
    ) {
        return userService.updateGrant(id, request, principal.organizationId());
    }

    @DeleteMapping("/grant/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteGrant(@PathVariable UUID id, @AuthenticationPrincipal AuthenticatedPrincipal principal) {
        userService.deleteGrant(id, principal.organizationId());
    }

    @GetMapping("/{id}/exchanges")
    public List<HistoricalExchangeResponse> getHistoricalExchanges(@PathVariable UUID id, @AuthenticationPrincipal AuthenticatedPrincipal principal) {
        requireSelfIfUser(id, principal);
        return userService.getHistoricalExchangesByUserId(id);
    }

    @GetMapping("/{id}/movements")
    public List<MovementResponse> getMovementsHistory(@PathVariable UUID id, @AuthenticationPrincipal AuthenticatedPrincipal principal) {
        requireSelfIfUser(id, principal);
        return userService.getMovementsByUserId(id);
    }

    private void requireSelfIfUser(UUID id, AuthenticatedPrincipal principal) {
        if ("USER".equals(principal.role()) && !principal.id().equals(id)) {
            throw new AccessDeniedException("No podés acceder a los datos de otro cliente.");
        }
    }

    @GetMapping("/top")
    @PreAuthorize("hasAnyRole('CASHIER', 'ADMIN')")
    public List<TopClientResponse> getTopClients(@AuthenticationPrincipal AuthenticatedPrincipal principal) {
        return userService.getTopClients(principal.organizationId());
    }

    /**
     * Claim a reward for the user
     *
     * @param request The information needed to create a record on both the exchanges table and the exchange_codes table
     * @return The code of the reward that was claimed.
     */
    @PostMapping("/claim-reward")
    @PreAuthorize("hasRole('USER')")
    public String claimReward(@Valid @RequestBody ClaimRewardRequest request, @AuthenticationPrincipal AuthenticatedPrincipal principal) {
        if (!principal.id().equals(request.userId())) {
            throw new AccessDeniedException("No podés canjear recompensas en nombre de otro cliente.");
        }
        return userService.claimReward(request);
    }
}
