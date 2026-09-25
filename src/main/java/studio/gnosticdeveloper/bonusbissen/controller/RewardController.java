package studio.gnosticdeveloper.bonusbissen.controller;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import studio.gnosticdeveloper.bonusbissen.dto.request.RewardCreateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.RewardUpdateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.PagedResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.RewardResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.TopRewardResponse;
import studio.gnosticdeveloper.bonusbissen.entity.Reward;
import studio.gnosticdeveloper.bonusbissen.security.AuthenticatedPrincipal;
import studio.gnosticdeveloper.bonusbissen.service.RewardService;

@RestController
@RequestMapping("/rewards")
public class RewardController {

    private final RewardService rewardService;

    public RewardController(RewardService rewardService) {
        this.rewardService = rewardService;
    }

    @GetMapping
    public PagedResponse<RewardResponse> list(
        @RequestParam(required = false) String search,
        @RequestParam(required = false) UUID programId,
        @RequestParam(required = false) UUID storefrontId,
        @PageableDefault(size = 10) Pageable pageable,
        @AuthenticationPrincipal AuthenticatedPrincipal principal
    ) {
        UUID organizationId = principal != null ? principal.organizationId() : null;
        Page<Reward> page = rewardService.listActive(search, organizationId, programId, storefrontId, pageable);
        return PagedResponse.from(page.map(RewardResponse::from));
    }

    @GetMapping("/{id}")
    public RewardResponse getById(@PathVariable UUID id) {
        return RewardResponse.from(rewardService.findById(id));
    }

    @GetMapping("/top")
    @PreAuthorize("hasAnyRole('CASHIER', 'ADMIN')")
    public List<TopRewardResponse> getTopRewards(@AuthenticationPrincipal AuthenticatedPrincipal principal) {
        return rewardService.getTopRewards(principal.organizationId());
    }

    @PostMapping(consumes = { MediaType.MULTIPART_FORM_DATA_VALUE })
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public RewardResponse create(@Valid @ModelAttribute RewardCreateRequest request, @AuthenticationPrincipal AuthenticatedPrincipal principal) {
        return RewardResponse.from(rewardService.create(request, principal.organizationId()));
    }

    @PutMapping(path = "/{id}", consumes = { MediaType.MULTIPART_FORM_DATA_VALUE })
    @PreAuthorize("hasRole('ADMIN')")
    public RewardResponse update(
        @PathVariable UUID id,
        @Valid @ModelAttribute RewardUpdateRequest request,
        @AuthenticationPrincipal AuthenticatedPrincipal principal
    ) {
        return RewardResponse.from(rewardService.update(id, request, principal.organizationId()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id, @AuthenticationPrincipal AuthenticatedPrincipal principal) {
        rewardService.delete(id, principal.organizationId());
    }
}
