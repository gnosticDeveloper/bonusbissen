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
import studio.gnosticdeveloper.bonusbissen.dto.request.GrantPointsRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.GrantPointsUpdateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.PasswordUpdateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.UserUpdateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.AdminUserInfoResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.HistoricalExchangeResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.HomeStatsResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.MovementResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.PagedResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.PointActionResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.TopClientResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.UserPointsAwardResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.UserPointsResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.UserResponse;
import studio.gnosticdeveloper.bonusbissen.security.AuthenticatedPrincipal;
import studio.gnosticdeveloper.bonusbissen.service.PointProgramService;
import studio.gnosticdeveloper.bonusbissen.service.UserService;

@RestController
@RequestMapping("/users")
public class UserController {

    private final UserService userService;
    private final PointProgramService pointProgramService;

    public UserController(UserService userService, PointProgramService pointProgramService) {
        this.userService = userService;
        this.pointProgramService = pointProgramService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('CASHIER', 'ADMIN')")
    public PagedResponse<UserPointsResponse> search(
        @RequestParam(required = false) String search,
        @RequestParam(required = false) UUID programId,
        Pageable pageable
    ) {
        return PagedResponse.from(userService.search(search, programId, pageable));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public UserResponse update(@PathVariable UUID id, @Valid @RequestBody UserUpdateRequest request) {
        return UserResponse.from(userService.update(id, request));
    }

    @PatchMapping("/{id}/password")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetPassword(@PathVariable UUID id, @Valid @RequestBody PasswordUpdateRequest request) {
        userService.resetPassword(id, request.newPassword());
    }

    @GetMapping("/home-stats")
    @PreAuthorize("hasAnyRole('CASHIER', 'ADMIN')")
    public HomeStatsResponse getHomeStats(@AuthenticationPrincipal AuthenticatedPrincipal principal) {
        return userService.getHomeStats(principal.organizationId());
    }

    @GetMapping("/me/admin")
    @PreAuthorize("hasAnyRole('CASHIER', 'ADMIN')")
    public AdminUserInfoResponse getMeAdmin(@AuthenticationPrincipal AuthenticatedPrincipal principal) {
        return userService.getAdminUserInfo(principal.id(), principal.organizationId());
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('USER')")
    public UserResponse getSelf(@AuthenticationPrincipal AuthenticatedPrincipal principal) {
        return UserResponse.from(userService.getById(principal.id()));
    }

    @PatchMapping("/me")
    @PreAuthorize("hasRole('USER')")
    public UserResponse updateSelf(@Valid @RequestBody UserUpdateRequest request, @AuthenticationPrincipal AuthenticatedPrincipal principal) {
        return UserResponse.from(userService.update(principal.id(), request));
    }

    /** Self-service join: the logged-in user opts in to a point program (issue #20). */
    @PostMapping("/me/point-programs/{programId}")
    @PreAuthorize("hasRole('USER')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void joinPointProgram(@PathVariable UUID programId, @AuthenticationPrincipal AuthenticatedPrincipal principal) {
        pointProgramService.join(principal.id(), programId);
    }

    /** Self-service join by storefront: the customer app only ever knows the storefront it's showing. */
    @PostMapping("/me/storefronts/{storefrontId}/point-programs")
    @PreAuthorize("hasRole('USER')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void joinPointProgramByStorefront(@PathVariable UUID storefrontId, @AuthenticationPrincipal AuthenticatedPrincipal principal) {
        pointProgramService.joinByStorefront(principal.id(), storefrontId);
    }

    @PostMapping("/me/resend-verification")
    @PreAuthorize("hasRole('USER')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resendOwnVerification(@AuthenticationPrincipal AuthenticatedPrincipal principal) {
        userService.resendOwnVerification(principal.id());
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

    @DeleteMapping("/me")
    @PreAuthorize("hasRole('USER')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSelf(@AuthenticationPrincipal AuthenticatedPrincipal principal) {
        userService.deleteById(principal.id());
    }

    @GetMapping("/{id}")
    public UserPointsResponse getById(
        @PathVariable UUID id,
        @RequestParam(required = false) UUID programId,
        @AuthenticationPrincipal AuthenticatedPrincipal principal
    ) {
        requireSelfIfUser(id, principal);
        return userService.getUserPointsById(id, programId);
    }

    @PostMapping("/grant")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public UserPointsAwardResponse grantPoints(
        @Valid @RequestBody GrantPointsRequest request,
        @AuthenticationPrincipal AuthenticatedPrincipal principal
    ) {
        return userService.grantPoints(request, principal.id(), principal.storefrontId());
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
    public List<HistoricalExchangeResponse> getHistoricalExchanges(
        @PathVariable UUID id,
        @RequestParam(required = false) UUID storefrontId,
        @AuthenticationPrincipal AuthenticatedPrincipal principal
    ) {
        requireSelfIfUser(id, principal);
        return userService.getHistoricalExchangesByUserId(id, storefrontId);
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
