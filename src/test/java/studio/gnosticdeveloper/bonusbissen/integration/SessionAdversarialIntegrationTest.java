package studio.gnosticdeveloper.bonusbissen.integration;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import studio.gnosticdeveloper.bonusbissen.dto.request.UserLoginRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.LoginResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.SessionResponse;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.entity.StaffRole;
import studio.gnosticdeveloper.bonusbissen.entity.Storefront;
import studio.gnosticdeveloper.bonusbissen.entity.User;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Adversarial tests for the refresh-token/session feature (issue #43): a malicious
 * or careless caller tries to bypass CSRF protection, act on someone else's
 * session, escalate across roles/orgs, or keep using a token that should already
 * be dead. All of these are expected to be blocked by the current implementation
 * (unlike AdversarialIntegrationTest, which documents real gaps) -- a failure
 * here means a real regression.
 */
class SessionAdversarialIntegrationTest extends AbstractIntegrationTest {

    private String cookieFrom(ResponseEntity<?> response) {
        List<String> setCookies = response.getHeaders().get(HttpHeaders.SET_COOKIE);
        assertThat(setCookies).isNotNull().isNotEmpty();
        String raw = setCookies.get(0);
        return raw.substring(0, raw.indexOf(';'));
    }

    private ResponseEntity<LoginResponse> loginAndCaptureCookie(String usernameKey) {
        return restTemplate.postForEntity(
            baseUrl() + "/auth/user-login",
            new UserLoginRequest(usernameKey, TEST_USER_PASSWORD),
            LoginResponse.class
        );
    }

    @Test
    void refreshWithoutCsrfHeaderIsRejectedEvenWithAValidCookie() {
        createUser("csrf-victim");
        String cookie = cookieFrom(loginAndCaptureCookie("csrf-victim"));

        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.COOKIE, cookie);
        // Deliberately omitting X-Requested-With, simulating a forged cross-site
        // <form> POST that carries the browser's cookies but can't set custom headers.
        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl() + "/auth/refresh", HttpMethod.POST, new HttpEntity<>(null, headers), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void logoutWithoutCsrfHeaderIsRejected() {
        createUser("csrf-logout-victim");
        String cookie = cookieFrom(loginAndCaptureCookie("csrf-logout-victim"));

        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.COOKIE, cookie);
        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl() + "/auth/logout", HttpMethod.POST, new HttpEntity<>(null, headers), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void aUserCannotRevokeAnotherUsersSession() {
        User victim = createUser("session-idor-victim");
        User attacker = createUser("session-idor-attacker");

        ResponseEntity<LoginResponse> victimLogin = loginAndCaptureCookie("session-idor-victim");
        String attackerToken = restTemplate.postForEntity(
            baseUrl() + "/auth/user-login", new UserLoginRequest("session-idor-attacker", TEST_USER_PASSWORD), LoginResponse.class
        ).getBody().token();

        ResponseEntity<SessionResponse[]> victimSessions = restTemplate.exchange(
            baseUrl() + "/auth/sessions", HttpMethod.GET,
            authed(restTemplate.postForEntity(baseUrl() + "/auth/user-login", new UserLoginRequest("session-idor-victim", TEST_USER_PASSWORD), LoginResponse.class).getBody().token()),
            SessionResponse[].class
        );
        UUID victimSessionId = victimSessions.getBody()[0].id();

        ResponseEntity<Void> attackerAttempt = restTemplate.exchange(
            baseUrl() + "/auth/sessions/" + victimSessionId, HttpMethod.DELETE, authed(attackerToken), Void.class);

        assertThat(attackerAttempt.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void aCashierCannotHitTheAdminOnlyStaffEvictionEndpoint() {
        User target = createEmployee("evict-guard-target", TEST_USER_PASSWORD, StaffRole.CASHIER);
        createEmployee("evict-guard-cashier", TEST_USER_PASSWORD, StaffRole.CASHIER);
        String cashierToken = loginEmployee("evict-guard-cashier", TEST_USER_PASSWORD);
        UUID targetStaffId = organizationStaffRepository.findByUserIdAndActiveTrue(target.getId()).orElseThrow().getId();

        ResponseEntity<Void> response = restTemplate.exchange(
            baseUrl() + "/staff/" + targetStaffId + "/sessions/revoke", HttpMethod.POST, authed(cashierToken), Void.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void anOrgAdminCannotEvictSessionsForStaffOfAnotherOrganization() {
        Organization otherOrg = new Organization();
        otherOrg.setName("Other Org");
        otherOrg = organizationRepository.save(otherOrg);
        Storefront otherStorefront = new Storefront();
        otherStorefront.setOrganization(otherOrg);
        otherStorefront.setName("Other Storefront");
        otherStorefront.setAddress("456 Other St");
        otherStorefront.setPointProgram(defaultProgram());
        otherStorefront = storefrontRepository.save(otherStorefront);

        User otherOrgStaff = createEmployee("other-org-staff", TEST_USER_PASSWORD, StaffRole.CASHIER, otherOrg, otherStorefront);
        UUID otherOrgStaffId = organizationStaffRepository.findByUserIdAndActiveTrue(otherOrgStaff.getId()).orElseThrow().getId();

        createEmployee("cross-org-admin", TEST_USER_PASSWORD, StaffRole.ADMIN);
        String adminToken = loginEmployee("cross-org-admin", TEST_USER_PASSWORD);

        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl() + "/staff/" + otherOrgStaffId + "/sessions/revoke", HttpMethod.POST, authed(adminToken), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void aTamperedJwtRoleClaimIsRejectedByTheSignatureCheck() {
        createUser("tamper-victim");
        String realToken = restTemplate.postForEntity(
            baseUrl() + "/auth/user-login", new UserLoginRequest("tamper-victim", TEST_USER_PASSWORD), LoginResponse.class
        ).getBody().token();

        // Decode the payload segment, flip "USER" to "ADMIN", re-encode, keep the
        // original signature -- classic "trust the header, forge the payload" attempt.
        String[] parts = realToken.split("\\.");
        String payload = new String(java.util.Base64.getUrlDecoder().decode(parts[1]));
        String forgedPayload = payload.replace("\"USER\"", "\"ADMIN\"");
        String forgedPayloadB64 = java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(forgedPayload.getBytes());
        String forgedToken = parts[0] + "." + forgedPayloadB64 + "." + parts[2];

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(forgedToken);
        // /staff is ADMIN-only; if the forged role were honored this would return 200/201 territory instead of 401/403.
        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl() + "/staff", HttpMethod.GET, new HttpEntity<>(null, headers), String.class);

        assertThat(response.getStatusCode()).isIn(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN);
    }

    @Test
    void logoutImmediatelyKillsTheAccessTokenNotJustTheRefreshCookie() {
        createUser("logout-kill-user");
        ResponseEntity<LoginResponse> login = loginAndCaptureCookie("logout-kill-user");
        String cookie = cookieFrom(login);
        String accessToken = login.getBody().token();

        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.COOKIE, cookie);
        headers.add("X-Requested-With", "XMLHttpRequest");
        headers.setBearerAuth(accessToken);
        ResponseEntity<Void> logout = restTemplate.exchange(
            baseUrl() + "/auth/logout", HttpMethod.POST, new HttpEntity<>(null, headers), Void.class);
        assertThat(logout.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        // The access token is still within its natural (unexpired) 15-minute
        // lifetime -- without the jti blacklist check, it would still authenticate.
        ResponseEntity<String> reuseAttempt = restTemplate.exchange(
            baseUrl() + "/auth/sessions", HttpMethod.GET, authed(accessToken), String.class);

        assertThat(reuseAttempt.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }
}
