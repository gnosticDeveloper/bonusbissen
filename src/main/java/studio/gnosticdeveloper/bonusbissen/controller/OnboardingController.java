package studio.gnosticdeveloper.bonusbissen.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import studio.gnosticdeveloper.bonusbissen.dto.response.OnboardingResponse;
import studio.gnosticdeveloper.bonusbissen.security.AuthenticatedPrincipal;
import studio.gnosticdeveloper.bonusbissen.service.OnboardingService;

@RestController
@RequestMapping("/onboarding")
public class OnboardingController {

    private final OnboardingService onboardingService;

    public OnboardingController(OnboardingService onboardingService) {
        this.onboardingService = onboardingService;
    }

    /** Usable with the USER session (before the org exists) and the ADMIN one (after the dashboard-session switch). */
    @GetMapping
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public OnboardingResponse get(@AuthenticationPrincipal AuthenticatedPrincipal principal) {
        return OnboardingResponse.from(onboardingService.getOrCreate(principal.id()));
    }
}
