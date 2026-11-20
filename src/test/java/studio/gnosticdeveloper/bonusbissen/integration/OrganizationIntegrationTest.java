package studio.gnosticdeveloper.bonusbissen.integration;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import studio.gnosticdeveloper.bonusbissen.dto.request.DashboardLoginRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.OrganizationCreateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.OrganizationResponse;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.entity.StaffRole;
import studio.gnosticdeveloper.bonusbissen.entity.User;

class OrganizationIntegrationTest extends AbstractIntegrationTest {

    private ResponseEntity<OrganizationResponse> create(String token, String name) {
        return restTemplate.exchange(baseUrl() + "/organizations", HttpMethod.POST, authed(token, new OrganizationCreateRequest(name)), OrganizationResponse.class);
    }

    @Test
    void userCreatesOrganizationAndBecomesItsAdmin() {
        User user = createUser("org-founder");
        String token = loginUser("org-founder");

        ResponseEntity<OrganizationResponse> response = create(token, "  Café Nuevo  ");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().name()).isEqualTo("Café Nuevo");
        assertThat(organizationStaffRepository.findByUserIdAndActiveTrue(user.getId()))
            .hasValueSatisfying(s -> {
                assertThat(s.getRole()).isEqualTo(StaffRole.ADMIN);
                assertThat(s.getOrganization().getId()).isEqualTo(response.getBody().id());
            });

        ResponseEntity<Void> signIn = restTemplate.exchange(
            baseUrl() + "/auth/dashboard/sign-in",
            HttpMethod.POST,
            new HttpEntity<>(new DashboardLoginRequest("org-founder", TEST_USER_PASSWORD, response.getBody().id())),
            Void.class
        );
        assertThat(signIn.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void existingStaffCannotCreateAnotherOrganization() {
        createUser("org-twice");
        String token = loginUser("org-twice");
        assertThat(create(token, "First").getStatusCode()).isEqualTo(HttpStatus.CREATED);

        // Still holding a USER token, so the staff check (not the role check) is what rejects it.
        assertThat(create(token, "Second").getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void staffTokenCannotCreateAnOrganization() {
        createEmployee("org-staff", TEST_USER_PASSWORD, StaffRole.ADMIN);
        String staffToken = loginEmployee("org-staff", TEST_USER_PASSWORD, defaultOrganization().getId());

        assertThat(create(staffToken, "Nope").getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void blankNameAndAnonymousCallsAreRejected() {
        createUser("org-blank");
        String token = loginUser("org-blank");
        assertThat(create(token, "   ").getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

        ResponseEntity<String> anonymous = restTemplate.postForEntity(baseUrl() + "/organizations", new OrganizationCreateRequest("Anon"), String.class);
        assertThat(anonymous.getStatusCode()).isIn(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN);
    }

    @Test
    void adminDeletesOrganizationSoftly() {
        createUser("org-doomed");
        String userToken = loginUser("org-doomed");
        Organization org = organizationRepository.findById(create(userToken, "Doomed Inc").getBody().id()).orElseThrow();

        String adminToken = loginEmployee("org-doomed", TEST_USER_PASSWORD, org.getId());
        ResponseEntity<Void> deleted = restTemplate.exchange(baseUrl() + "/organization", HttpMethod.DELETE, authed(adminToken), Void.class);

        assertThat(deleted.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(organizationRepository.findById(org.getId())).hasValueSatisfying(o -> assertThat(o.isActive()).isFalse());
        assertThat(organizationRepository.search("Doomed", PageRequest.of(0, 10)).getContent()).isEmpty();

        // Staff is freed and the old token is dead.
        User founder = userRepository.findByUsername("org-doomed").orElseThrow();
        assertThat(organizationStaffRepository.findByUserIdAndActiveTrue(founder.getId())).isEmpty();
        ResponseEntity<String> afterwards = restTemplate.exchange(baseUrl() + "/organization", HttpMethod.GET, authed(adminToken), String.class);
        assertThat(afterwards.getStatusCode()).isIn(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN);
    }

    @Test
    void cashierCannotDeleteOrganization() {
        createEmployee("org-cashier", TEST_USER_PASSWORD, StaffRole.CASHIER);
        String token = loginEmployee("org-cashier", TEST_USER_PASSWORD, defaultOrganization().getId());

        ResponseEntity<String> response = restTemplate.exchange(baseUrl() + "/organization", HttpMethod.DELETE, authed(token), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }
}
