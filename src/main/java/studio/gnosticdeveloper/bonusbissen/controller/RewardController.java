package studio.gnosticdeveloper.bonusbissen.controller;

import studio.gnosticdeveloper.bonusbissen.dto.request.RewardCreateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.RewardResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.TopRewardResponse;
import studio.gnosticdeveloper.bonusbissen.service.RewardService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/rewards")
public class RewardController {

    private final RewardService rewardService;

    public RewardController(RewardService rewardService) {
        this.rewardService = rewardService;
    }

    @GetMapping
    public List<RewardResponse> list() {
        return rewardService.listActive().stream().map(RewardResponse::from).toList();
    }

    @GetMapping("/{id}")
    public RewardResponse getById(@PathVariable UUID id) {
        return RewardResponse.from(rewardService.findById(id));
    }

    // @GetMapping("/top")
    // @PreAuthorize("hasAnyRole('CASHIER', 'ADMIN')")
    // public List<TopRewardResponse> getTopRewards() {
    //     return rewardService.getTopRewards();
    // }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public RewardResponse create(@Valid @RequestBody RewardCreateRequest request) {
        return RewardResponse.from(rewardService.create(request));
    }

    // @PatchMapping("/{id}")
    // @PreAuthorize("hasRole('ADMIN')")
    // public RewardResponse update(@PathVariable UUID id, @Valid @RequestBody RewardUpdateRequest request) {
    //     return RewardResponse.from(rewardService.update(id, request));
    // }
}
