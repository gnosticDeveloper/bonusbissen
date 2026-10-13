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
import studio.gnosticdeveloper.bonusbissen.entity.StaffRole;
import studio.gnosticdeveloper.bonusbissen.entity.User;

import static org.assertj.core.api.Assertions.assertThat;

/** Refresh-token rotation, replay detection, and session listing/eviction (issue #43). */
class SessionIntegrationTest extends AbstractIntegrationTest {

    @Test
    void refreshRotatesTheCookieAndReplayOfTheOldOneRevokesEveryOtherSession() {
        createUser("rotate-user");

        ResponseEntity<LoginResponse> login = restTemplate.postForEntity(
            baseUrl() + "/auth/user-login",
            new UserLoginRequest("rotate-user", TEST_USER_PASSWORD),
            LoginResponse.class
        );
        String firstCookie = extractCookie(login);
        assertThat(firstCookie).isNotBlank();

        ResponseEntity<LoginResponse> refreshed = refresh(firstCookie);
        assertThat(refreshed.getStatusCode()).isEqualTo(HttpStatus.OK);
        String secondCookie = extractCookie(refreshed);
        assertThat(secondCookie).isNotBlank().isNotEqualTo(firstCookie);

        // Replaying the already-rotated-out cookie is a theft signal: it should
        // kill every session for the user, including the one just rotated to.
        ResponseEntity<String> replay = refresh(firstCookie, String.class);
        assertThat(replay.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);

        ResponseEntity<String> refreshAfterReplay = refresh(secondCookie, String.class);
        assertThat(refreshAfterReplay.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void listingAndRevokingOneSessionLeavesTheOthersIntact() {
        User user = createUser("multi-device-user");

        ResponseEntity<LoginResponse> deviceA = restTemplate.postForEntity(
            baseUrl() + "/auth/user-login",
            new UserLoginRequest("multi-device-user", TEST_USER_PASSWORD),
            LoginResponse.class
        );
        ResponseEntity<LoginResponse> deviceB = restTemplate.postForEntity(
            baseUrl() + "/auth/user-login",
            new UserLoginRequest("multi-device-user", TEST_USER_PASSWORD),
            LoginResponse.class
        );
        String tokenA = deviceA.getBody().token();
        String tokenB = deviceB.getBody().token();

        ResponseEntity<SessionResponse[]> listed = restTemplate.exchange(
            baseUrl() + "/auth/sessions",
            HttpMethod.GET,
            authed(tokenA),
            SessionResponse[].class
        );
        assertThat(listed.getBody()).hasSize(2);

        UUID sessionToRevoke = listed.getBody()[0].id();
        ResponseEntity<Void> revoke = restTemplate.exchange(
            baseUrl() + "/auth/sessions/" + sessionToRevoke,
            HttpMethod.DELETE,
            authed(tokenA),
            Void.class
        );
        assertThat(revoke.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        // Revoking one session only drops its refresh token; the still-valid
        // (short-lived) access token for either device keeps working until it
        // naturally expires -- this endpoint isn't the immediate-kill path.
        ResponseEntity<SessionResponse[]> remaining = restTemplate.exchange(
            baseUrl() + "/auth/sessions",
            HttpMethod.GET,
            authed(tokenB),
            SessionResponse[].class
        );
        assertThat(remaining.getBody()).hasSize(1);
        assertThat(remaining.getBody()[0].id()).isNotEqualTo(sessionToRevoke);
    }

    @Test
    void orgAdminEvictionImmediatelyRejectsTheTargetsCurrentAccessToken() {
        User target = createEmployee("evict-target", TEST_USER_PASSWORD, StaffRole.CASHIER);
        String targetToken = loginEmployee("evict-target", TEST_USER_PASSWORD);

        createEmployee("evict-admin", TEST_USER_PASSWORD, StaffRole.ADMIN);
        String adminToken = loginEmployee("evict-admin", TEST_USER_PASSWORD);

        UUID targetStaffId = organizationStaffRepository.findByUserIdAndActiveTrue(target.getId()).orElseThrow().getId();

        ResponseEntity<Void> evict = restTemplate.exchange(
            baseUrl() + "/staff/" + targetStaffId + "/sessions/revoke",
            HttpMethod.POST,
            authed(adminToken),
            Void.class
        );
        assertThat(evict.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        ResponseEntity<String> afterEviction = restTemplate.exchange(
            baseUrl() + "/auth/sessions",
            HttpMethod.GET,
            authed(targetToken),
            String.class
        );
        assertThat(afterEviction.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    private ResponseEntity<LoginResponse> refresh(String cookie) {
        return refresh(cookie, LoginResponse.class);
    }

    private <T> ResponseEntity<T> refresh(String cookie, Class<T> responseType) {
        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.COOKIE, cookie);
        headers.add("X-Requested-With", "XMLHttpRequest");
        return restTemplate.exchange(baseUrl() + "/auth/refresh", HttpMethod.POST, new HttpEntity<>(null, headers), responseType);
    }

    private static String extractCookie(ResponseEntity<?> response) {
        List<String> setCookies = response.getHeaders().get(HttpHeaders.SET_COOKIE);
        assertThat(setCookies).isNotNull().isNotEmpty();
        String raw = setCookies.get(0);
        return raw.substring(0, raw.indexOf(';'));
    }
}
