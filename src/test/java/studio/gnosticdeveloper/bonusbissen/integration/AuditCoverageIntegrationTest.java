package studio.gnosticdeveloper.bonusbissen.integration;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import studio.gnosticdeveloper.bonusbissen.dto.request.AttachStorefrontsRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.PointProgramUpdateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.SelfPasswordUpdateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.UserUpdateRequest;
import studio.gnosticdeveloper.bonusbissen.entity.OperationType;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.entity.PointProgram;
import studio.gnosticdeveloper.bonusbissen.entity.StaffRole;
import studio.gnosticdeveloper.bonusbissen.entity.Storefront;
import studio.gnosticdeveloper.bonusbissen.entity.TraceabilityLog;
import studio.gnosticdeveloper.bonusbissen.entity.User;
import studio.gnosticdeveloper.bonusbissen.service.TraceabilityService;

/**
 * Quality report B15: the audit records who changed an account, a staff member's access, a program
 * or an organization, and each row carries the organization it belongs to.
 */
class AuditCoverageIntegrationTest extends AbstractIntegrationTest {

    private static final ParameterizedTypeReference<List<Map<String, Object>>> ROWS = new ParameterizedTypeReference<>() {};

    @Autowired
    private TraceabilityService traceabilityService;

    private String adminToken(String username) {
        createEmployee(username, TEST_USER_PASSWORD, StaffRole.ADMIN);
        return loginEmployee(username, TEST_USER_PASSWORD);
    }

    private List<Map<String, Object>> auditRows(String adminToken, String query) {
        ResponseEntity<List<Map<String, Object>>> response = restTemplate.exchange(
            baseUrl() + "/traceability?" + query, HttpMethod.GET, authed(adminToken), ROWS
        );
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> details(Map<String, Object> row) {
        return (Map<String, Object>) row.get("details");
    }

    @Test
    void removingAStaffMemberAndChangingTheirStorefrontsAreAudited() {
        String adminToken = adminToken("audit-staff-admin");
        User target = createEmployee("audit-staff-target", TEST_USER_PASSWORD, StaffRole.CASHIER);
        UUID staffId = organizationStaffRepository.findByUserIdAndActiveTrue(target.getId()).orElseThrow().getId();
        Storefront extra = new Storefront();
        extra.setOrganization(defaultOrganization());
        extra.setName("Audit extra storefront");
        extra.setAddress("1 Audit St");
        extra = storefrontRepository.save(extra);

        ResponseEntity<String> attach = restTemplate.exchange(
            baseUrl() + "/staff/" + staffId + "/storefronts", HttpMethod.POST,
            authed(adminToken, new AttachStorefrontsRequest(List.of(extra.getId()))), String.class
        );
        assertThat(attach.getStatusCode()).isEqualTo(HttpStatus.OK);
        ResponseEntity<String> remove = restTemplate.exchange(
            baseUrl() + "/staff/" + staffId, HttpMethod.DELETE, authed(adminToken), String.class
        );
        assertThat(remove.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        List<Map<String, Object>> storefrontRows = auditRows(adminToken, "operationType=STAFF_STOREFRONTS_UPDATE&affectedUserId=" + target.getId());
        assertThat(storefrontRows).hasSize(1);
        assertThat(details(storefrontRows.get(0)).get("action")).isEqualTo("attach");
        assertThat((List<?>) details(storefrontRows.get(0)).get("storefronts")).hasSize(1);

        List<Map<String, Object>> removalRows = auditRows(adminToken, "operationType=STAFF_DEACTIVATE&affectedUserId=" + target.getId());
        assertThat(removalRows).hasSize(1);
        assertThat(details(removalRows.get(0)).get("role")).isEqualTo("CASHIER");
    }

    @Test
    void anAdminEditingDeactivatingAndReactivatingACustomerLeavesATrail() {
        String adminToken = adminToken("audit-customer-admin");
        User customer = createUser("audit-customer");
        joinProgram(customer.getId(), defaultProgram());

        restTemplate.exchange(
            baseUrl() + "/users/" + customer.getId(), HttpMethod.PATCH,
            authed(adminToken, new UserUpdateRequest("Audited Customer", "audit-customer@example.com")), String.class
        );
        restTemplate.exchange(baseUrl() + "/users/" + customer.getId(), HttpMethod.DELETE, authed(adminToken), String.class);
        restTemplate.exchange(baseUrl() + "/users/" + customer.getId() + "/reactivate", HttpMethod.PATCH, authed(adminToken), String.class);

        List<Map<String, Object>> edits = auditRows(adminToken, "operationType=USER_UPDATE&affectedUserId=" + customer.getId());
        assertThat(edits).hasSize(1);
        assertThat(details(edits.get(0)).get("previousEmail")).isNull();
        assertThat(details(edits.get(0)).get("email")).isEqualTo("audit-customer@example.com");
        assertThat(details(edits.get(0)).get("name")).isEqualTo("Audited Customer");
        assertThat(auditRows(adminToken, "operationType=USER_DEACTIVATE&affectedUserId=" + customer.getId())).hasSize(1);
        assertThat(auditRows(adminToken, "operationType=USER_REACTIVATE&affectedUserId=" + customer.getId())).hasSize(1);
    }

    /** A session revocation made by someone who has since left the staff used to vanish from the organization's audit. */
    @Test
    void anEmployeeWhoLeftStillAppearsInTheOrganizationsAudit() {
        String adminToken = adminToken("audit-leaver-admin");
        User leaver = createUser("audit-leaver");
        User target = createUser("audit-leaver-target");

        traceabilityService.record(OperationType.SESSION_REVOKE, defaultOrganization().getId(), leaver.getId(), target.getId(), Map.of());

        List<Map<String, Object>> rows = auditRows(adminToken, "operationType=SESSION_REVOKE&originatingUserId=" + leaver.getId());
        assertThat(rows).hasSize(1);
    }

    @Test
    void auditRowsAreNewestFirst() {
        String adminToken = adminToken("audit-order-admin");
        User originator = createUser("audit-order-originator");
        User target = createUser("audit-order-target");
        UUID first = traceabilityService.record(OperationType.SESSION_REVOKE, defaultOrganization().getId(), originator.getId(), target.getId(), Map.of());
        UUID second = traceabilityService.record(OperationType.SESSION_REVOKE, defaultOrganization().getId(), originator.getId(), target.getId(), Map.of());

        List<Map<String, Object>> rows = auditRows(adminToken, "originatingUserId=" + originator.getId());

        assertThat(rows).extracting(row -> row.get("operationId")).containsExactly(second.toString(), first.toString());
    }

    /** Uses a separate organization: changing the shared test program's expiration would affect other tests. */
    @Test
    void programChangesAndOrganizationDeactivationAreAudited() {
        Organization organization = new Organization();
        organization.setName("Audit program org");
        organization = organizationRepository.save(organization);
        PointProgram program = new PointProgram();
        program.setOrganization(organization);
        program.setName("Audit program");
        program = pointProgramRepository.save(program);
        User admin = createEmployee("audit-program-admin", TEST_USER_PASSWORD, StaffRole.ADMIN, organization, null);
        String adminToken = loginEmployee("audit-program-admin", TEST_USER_PASSWORD, organization.getId());

        ResponseEntity<String> update = restTemplate.exchange(
            baseUrl() + "/point-programs/" + program.getId(), HttpMethod.PATCH,
            authed(adminToken, new PointProgramUpdateRequest("Audit program renamed", null, true, 6)), String.class
        );
        assertThat(update.getStatusCode()).isEqualTo(HttpStatus.OK);

        List<Map<String, Object>> rows = auditRows(adminToken, "operationType=POINT_PROGRAM_UPDATE&originatingUserId=" + admin.getId());
        assertThat(rows).hasSize(1);
        Map<String, Object> change = details(rows.get(0));
        assertThat(change.get("previousName")).isEqualTo("Audit program");
        assertThat(change.get("name")).isEqualTo("Audit program renamed");
        assertThat(change.get("previousExpirationMonths")).isNull();
        assertThat(change.get("expirationMonths")).isEqualTo(6);

        ResponseEntity<String> deactivate = restTemplate.exchange(baseUrl() + "/organization", HttpMethod.DELETE, authed(adminToken), String.class);
        assertThat(deactivate.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        List<TraceabilityLog> logs = traceabilityService.find(OperationType.ORGANIZATION_DEACTIVATE, admin.getId(), null);
        assertThat(logs).hasSize(1);
        assertThat(logs.get(0).getOrganizationId()).isEqualTo(organization.getId());
        assertThat(logs.get(0).getAffectedUserIds()).contains(admin.getId());
    }

    /** A user's own account change belongs to no organization, so no admin's audit lists it. */
    @Test
    void aPasswordChangeIsAuditedWithoutAnOrganization() {
        User user = createUser("audit-password-user");
        String token = loginUser("audit-password-user");

        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl() + "/users/me/password", HttpMethod.PATCH,
            authed(token, new SelfPasswordUpdateRequest(TEST_USER_PASSWORD, "New-Password-123!")), String.class
        );
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        List<TraceabilityLog> logs = traceabilityService.find(OperationType.PASSWORD_CHANGE, user.getId(), null);
        assertThat(logs).hasSize(1);
        assertThat(logs.get(0).getOrganizationId()).isNull();
        assertThat(logs.get(0).getAffectedUserIds()).containsExactly(user.getId());
    }
}
