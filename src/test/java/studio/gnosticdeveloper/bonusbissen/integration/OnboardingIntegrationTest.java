package studio.gnosticdeveloper.bonusbissen.integration;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import studio.gnosticdeveloper.bonusbissen.dto.request.OrganizationCreateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.PointProgramCreateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.StorefrontCreateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.OnboardingResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.OrganizationResponse;
import studio.gnosticdeveloper.bonusbissen.entity.OnboardingStep;
import studio.gnosticdeveloper.bonusbissen.service.OnboardingService;

class OnboardingIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private OnboardingService onboardingService;

    private OnboardingResponse onboarding(String token) {
        ResponseEntity<OnboardingResponse> response = restTemplate.exchange(baseUrl() + "/onboarding", HttpMethod.GET, authed(token), OnboardingResponse.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody();
    }

    @Test
    void progressAdvancesStepByStepUntilCompleted() {
        createUser("onb-founder");
        String userToken = loginUser("onb-founder");
        assertThat(onboarding(userToken).currentStep()).isEqualTo(OnboardingStep.CREATE_ORGANIZATION);

        UUID orgId = restTemplate.exchange(baseUrl() + "/organizations", HttpMethod.POST, authed(userToken, new OrganizationCreateRequest("Onboarded Co")), OrganizationResponse.class)
            .getBody().id();
        OnboardingResponse afterOrg = onboarding(userToken);
        assertThat(afterOrg.currentStep()).isEqualTo(OnboardingStep.PAY);
        assertThat(afterOrg.organizationId()).isEqualTo(orgId);

        String adminToken = loginEmployee("onb-founder", TEST_USER_PASSWORD, orgId);
        // Creating things out of order doesn't skip the payment step.
        assertThat(restTemplate.exchange(baseUrl() + "/storefronts", HttpMethod.POST, authed(adminToken, new StorefrontCreateRequest("Local", true, null, null, null, null, null, null, null, null, null)), String.class).getStatusCode())
            .isEqualTo(HttpStatus.CREATED);
        assertThat(onboarding(adminToken).currentStep()).isEqualTo(OnboardingStep.PAY);

        onboardingService.markPaid(orgId);
        assertThat(onboarding(adminToken).currentStep()).isEqualTo(OnboardingStep.CREATE_POINT_PROGRAM);

        assertThat(restTemplate.exchange(baseUrl() + "/point-programs", HttpMethod.POST, authed(adminToken, new PointProgramCreateRequest("Puntos", null, null)), String.class).getStatusCode())
            .isEqualTo(HttpStatus.CREATED);
        OnboardingResponse done = onboarding(adminToken);
        assertThat(done.currentStep()).isEqualTo(OnboardingStep.COMPLETED);
        assertThat(done.completedAt()).isNotNull();
    }

    @Test
    void repeatedStepsKeepTheirFirstTimestamp() {
        createUser("onb-repeat");
        String userToken = loginUser("onb-repeat");
        UUID orgId = restTemplate.exchange(baseUrl() + "/organizations", HttpMethod.POST, authed(userToken, new OrganizationCreateRequest("Repeat Co")), OrganizationResponse.class)
            .getBody().id();
        String adminToken = loginEmployee("onb-repeat", TEST_USER_PASSWORD, orgId);
        StorefrontCreateRequest storefront = new StorefrontCreateRequest("Local", true, null, null, null, null, null, null, null, null, null);

        restTemplate.exchange(baseUrl() + "/storefronts", HttpMethod.POST, authed(adminToken, storefront), String.class);
        onboardingService.markPaid(orgId);
        OnboardingResponse first = onboarding(adminToken);

        restTemplate.exchange(baseUrl() + "/storefronts", HttpMethod.POST, authed(adminToken, storefront), String.class);
        onboardingService.markPaid(orgId);
        onboardingService.markOrganizationCreated(userRepository.findByUsername("onb-repeat").orElseThrow().getId(), orgId);
        OnboardingResponse second = onboarding(adminToken);

        assertThat(second.organizationCreatedAt()).isEqualTo(first.organizationCreatedAt());
        assertThat(second.paidAt()).isEqualTo(first.paidAt());
        assertThat(second.storefrontCreatedAt()).isEqualTo(first.storefrontCreatedAt());
    }

    @Test
    void anonymousIsRejected() {
        ResponseEntity<String> response = restTemplate.getForEntity(baseUrl() + "/onboarding", String.class);
        assertThat(response.getStatusCode()).isIn(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN);
    }
}
