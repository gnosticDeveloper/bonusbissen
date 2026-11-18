package studio.gnosticdeveloper.bonusbissen.integration;

import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import studio.gnosticdeveloper.bonusbissen.dto.request.DashboardLoginRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.StaffCreateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.StaffUpdateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.StaffResponse;
import studio.gnosticdeveloper.bonusbissen.entity.OperationType;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.entity.StaffRole;
import studio.gnosticdeveloper.bonusbissen.entity.Storefront;
import studio.gnosticdeveloper.bonusbissen.entity.User;
import studio.gnosticdeveloper.bonusbissen.repository.TraceabilityLogRepository;

import static org.assertj.core.api.Assertions.assertThat;

class StaffIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TraceabilityLogRepository traceabilityLogRepository;

    private UUID staffIdOf(String adminToken, String username) {
        ResponseEntity<List<StaffResponse>> listed = restTemplate.exchange(
            baseUrl() + "/staff", HttpMethod.GET, authed(adminToken), new ParameterizedTypeReference<>() {}
        );
        return listed.getBody().stream().filter(m -> m.username().equals(username)).findFirst().orElseThrow().id();
    }

    private ResponseEntity<String> patchRole(String token, UUID staffId, StaffRole role) {
        return restTemplate.exchange(baseUrl() + "/staff/" + staffId, HttpMethod.PATCH, authed(token, new StaffUpdateRequest(role)), String.class);
    }

    private static void sleepPastTheRevocationCutoff() {
        try {
            Thread.sleep(1100);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private ResponseEntity<String> remove(String token, UUID staffId) {
        return restTemplate.exchange(baseUrl() + "/staff/" + staffId, HttpMethod.DELETE, authed(token), String.class);
    }

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

    @Test
    void anAdminCannotRemoveThemselves() {
        String adminToken = adminToken("self-remove-admin");
        UUID ownStaffId = staffIdOf(adminToken, "self-remove-admin");

        assertThat(remove(adminToken, ownStaffId).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

        // Still active: the same token keeps working.
        assertThat(staffIdOf(adminToken, "self-remove-admin")).isEqualTo(ownStaffId);
    }

    @Test
    void anAdminCanStillRemoveAnotherMember() {
        String adminToken = adminToken("remover-admin");
        createEmployee("removable-cashier", TEST_USER_PASSWORD, StaffRole.CASHIER);
        UUID cashierStaffId = staffIdOf(adminToken, "removable-cashier");

        assertThat(remove(adminToken, cashierStaffId).getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
    }

    @Test
    void anAdminChangesAnotherMembersRoleAndTheirOldSessionStopsWorking() {
        String adminToken = adminToken("role-admin");
        createEmployee("role-cashier", TEST_USER_PASSWORD, StaffRole.CASHIER);
        String oldCashierToken = loginEmployee("role-cashier", TEST_USER_PASSWORD, defaultOrganization().getId());
        UUID cashierStaffId = staffIdOf(adminToken, "role-cashier");

        ResponseEntity<StaffResponse> promoted = restTemplate.exchange(
            baseUrl() + "/staff/" + cashierStaffId, HttpMethod.PATCH,
            authed(adminToken, new StaffUpdateRequest(StaffRole.ADMIN)), StaffResponse.class
        );

        assertThat(promoted.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(promoted.getBody().role()).isEqualTo(StaffRole.ADMIN);
        // /auth/sessions is open to any role, so a rejection here can only come from the revocation.
        ResponseEntity<String> withOldToken = restTemplate.exchange(baseUrl() + "/auth/sessions", HttpMethod.GET, authed(oldCashierToken), String.class);
        assertThat(withOldToken.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        // Token issue times have one-second resolution and the revocation cutoff is in milliseconds,
        // so a login in the same second as the change would be rejected too.
        sleepPastTheRevocationCutoff();
        String newToken = loginEmployee("role-cashier", TEST_USER_PASSWORD, defaultOrganization().getId());
        ResponseEntity<String> withNewToken = restTemplate.exchange(baseUrl() + "/staff", HttpMethod.GET, authed(newToken), String.class);
        assertThat(withNewToken.getStatusCode()).isEqualTo(HttpStatus.OK);

        assertThat(traceabilityLogRepository.findAll())
            .anyMatch(log -> log.getOperationType() == OperationType.STAFF_ROLE_UPDATE
                && "CASHIER".equals(log.getPayload().get("previousRole"))
                && "ADMIN".equals(log.getPayload().get("newRole")));
    }

    @Test
    void anAdminCannotChangeTheirOwnRole() {
        String adminToken = adminToken("self-role-admin");
        UUID ownStaffId = staffIdOf(adminToken, "self-role-admin");

        assertThat(patchRole(adminToken, ownStaffId, StaffRole.CASHIER).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void cannotChangeTheRoleOfARemovedMember() {
        String adminToken = adminToken("removed-role-admin");
        createEmployee("removed-cashier", TEST_USER_PASSWORD, StaffRole.CASHIER);
        UUID cashierStaffId = staffIdOf(adminToken, "removed-cashier");
        remove(adminToken, cashierStaffId);

        assertThat(patchRole(adminToken, cashierStaffId, StaffRole.ADMIN).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void aCashierCannotChangeRoles() {
        String adminToken = adminToken("cashier-role-admin");
        createEmployee("cashier-actor", TEST_USER_PASSWORD, StaffRole.CASHIER);
        createEmployee("cashier-target", TEST_USER_PASSWORD, StaffRole.CASHIER);
        UUID targetStaffId = staffIdOf(adminToken, "cashier-target");
        String cashierToken = loginEmployee("cashier-actor", TEST_USER_PASSWORD, defaultOrganization().getId());

        assertThat(patchRole(cashierToken, targetStaffId, StaffRole.ADMIN).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void cannotChangeOrRemoveStaffOfAnotherOrganization() {
        Organization otherOrg = new Organization();
        otherOrg.setName("Other Org Staff");
        otherOrg = organizationRepository.save(otherOrg);
        Storefront otherStorefront = new Storefront();
        otherStorefront.setOrganization(otherOrg);
        otherStorefront.setName("Other Storefront");
        otherStorefront.setAddress("1 Other St");
        otherStorefront = storefrontRepository.save(otherStorefront);
        createEmployee("foreign-cashier", TEST_USER_PASSWORD, StaffRole.CASHIER, otherOrg, otherStorefront);
        String foreignAdminToken = null;
        createEmployee("foreign-admin", TEST_USER_PASSWORD, StaffRole.ADMIN, otherOrg, otherStorefront);
        foreignAdminToken = loginEmployee("foreign-admin", TEST_USER_PASSWORD, otherOrg.getId());
        UUID foreignStaffId = staffIdOf(foreignAdminToken, "foreign-cashier");

        String adminToken = adminToken("idor-admin");

        assertThat(patchRole(adminToken, foreignStaffId, StaffRole.ADMIN).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(remove(adminToken, foreignStaffId).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }
}
