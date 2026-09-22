package studio.gnosticdeveloper.bonusbissen.integration;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import studio.gnosticdeveloper.bonusbissen.dto.request.DashboardLoginRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.StaffCreateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.StaffResponse;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.entity.StaffRole;
import studio.gnosticdeveloper.bonusbissen.entity.Storefront;
import studio.gnosticdeveloper.bonusbissen.entity.User;

import static org.assertj.core.api.Assertions.assertThat;

class StaffIntegrationTest extends AbstractIntegrationTest {

    private String adminToken(String username) {
        createEmployee(username, TEST_USER_PASSWORD, StaffRole.ADMIN);
        return loginEmployee(username, TEST_USER_PASSWORD, defaultOrganization().getId());
    }

    @Test
    void adminPromotesAnExistingUserToStaffOfTheirOrganization() {
        String adminToken = adminToken("staff-admin");
        User customer = createUser("promote-me");

        ResponseEntity<StaffResponse> response = restTemplate.exchange(
            baseUrl() + "/staff",
            HttpMethod.POST,
            authed(adminToken, new StaffCreateRequest(customer.getId(), StaffRole.CASHIER, defaultStorefront().getId())),
            StaffResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().role()).isEqualTo(StaffRole.CASHIER);
        assertThat(response.getBody().storefronts()).extracting(s -> s.id()).containsExactly(defaultStorefront().getId());

        // The newly promoted user can now sign in on the staff dashboard.
        ResponseEntity<Void> loginAttempt = restTemplate.exchange(
            baseUrl() + "/auth/dashboard/sign-in",
            HttpMethod.POST,
            new HttpEntity<>(new DashboardLoginRequest("promote-me", TEST_USER_PASSWORD, defaultOrganization().getId())),
            Void.class
        );
        assertThat(loginAttempt.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void cannotPromoteAUserWhoIsAlreadyStaff() {
        String adminToken = adminToken("staff-admin-2");
        User alreadyStaff = createEmployee("already-staff", TEST_USER_PASSWORD, StaffRole.CASHIER);

        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl() + "/staff",
            HttpMethod.POST,
            authed(adminToken, new StaffCreateRequest(alreadyStaff.getId(), StaffRole.CASHIER, null)),
            String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void cannotAssignAStorefrontFromAnotherOrganization() {
        Organization otherOrg = new Organization();
        otherOrg.setName("Other Org");
        otherOrg = organizationRepository.save(otherOrg);

        Storefront otherOrgStorefront = new Storefront();
        otherOrgStorefront.setOrganization(otherOrg);
        otherOrgStorefront.setName("Foreign Storefront");
        otherOrgStorefront.setAddress("999 Foreign St");
        otherOrgStorefront = storefrontRepository.save(otherOrgStorefront);

        String adminToken = adminToken("staff-admin-3");
        User customer = createUser("promote-me-2");

        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl() + "/staff",
            HttpMethod.POST,
            authed(adminToken, new StaffCreateRequest(customer.getId(), StaffRole.CASHIER, otherOrgStorefront.getId())),
            String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void aCashierCannotCreateStaff() {
        createEmployee("staff-cashier", TEST_USER_PASSWORD, StaffRole.CASHIER);
        String cashierToken = loginEmployee("staff-cashier", TEST_USER_PASSWORD, defaultOrganization().getId());
        User customer = createUser("promote-me-3");

        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl() + "/staff",
            HttpMethod.POST,
            authed(cashierToken, new StaffCreateRequest(customer.getId(), StaffRole.CASHIER, null)),
            String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }
}
