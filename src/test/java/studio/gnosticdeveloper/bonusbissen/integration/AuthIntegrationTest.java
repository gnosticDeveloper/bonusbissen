package studio.gnosticdeveloper.bonusbissen.integration;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import studio.gnosticdeveloper.bonusbissen.dto.request.DashboardLoginRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.LoginLinkConsumeRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.RequestDashboardLoginLinkRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.RequestUserLoginLinkRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.ResendVerificationRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.UserLoginRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.UserRegisterRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.VerifyEmailRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.LoginResponse;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.entity.StaffRole;
import studio.gnosticdeveloper.bonusbissen.entity.User;

import static org.assertj.core.api.Assertions.assertThat;

class AuthIntegrationTest extends AbstractIntegrationTest {

    @Test
    void dashboardSignInWithMatchingOrganizationReturnsToken() {
        createEmployee("cashier-dash-ok", "password123", StaffRole.CASHIER);

        ResponseEntity<LoginResponse> response = restTemplate.postForEntity(
            baseUrl() + "/auth/dashboard/sign-in",
            new DashboardLoginRequest("cashier-dash-ok", "password123", defaultOrganization().getId()),
            LoginResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().token()).isNotBlank();
    }

    @Test
    void dashboardSignInWithWrongOrganizationIsRejected() {
        createEmployee("cashier-dash-wrong-org", "password123", StaffRole.CASHIER);

        ResponseEntity<String> response = restTemplate.postForEntity(
            baseUrl() + "/auth/dashboard/sign-in",
            new DashboardLoginRequest("cashier-dash-wrong-org", "password123", UUID.randomUUID()),
            String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void dashboardSignInWithWrongPasswordIsRejected() {
        createEmployee("cashier-auth-wrong-pw", "correct-password", StaffRole.CASHIER);

        ResponseEntity<String> response = restTemplate.postForEntity(
            baseUrl() + "/auth/dashboard/sign-in",
            new DashboardLoginRequest("cashier-auth-wrong-pw", "wrong-password", defaultOrganization().getId()),
            String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void dashboardSignInWithUnknownUsernameIsRejected() {
        ResponseEntity<String> response = restTemplate.postForEntity(
            baseUrl() + "/auth/dashboard/sign-in",
            new DashboardLoginRequest("ghost-user", "whatever", defaultOrganization().getId()),
            String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void registerReturnsTokenAndDoesNotSendMailWithoutEmail() {
        ResponseEntity<LoginResponse> response = restTemplate.postForEntity(
            baseUrl() + "/auth/user-register",
            new UserRegisterRequest("alice", "S3cret-Password!", "Alice", null),
            LoginResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().token()).isNotBlank();
        assertThat(recordingEmailSender.sent()).noneMatch(s -> "alice".equals(s.name()));
    }

    @Test
    void registerWithEmailSendsVerificationMail() {
        recordingEmailSender.clear();

        ResponseEntity<LoginResponse> response = restTemplate.postForEntity(
            baseUrl() + "/auth/user-register",
            new UserRegisterRequest("bob", "S3cret-Password!", "Bob", "Bob@Example.com"),
            LoginResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        RecordingEmailSender.Sent sent = recordingEmailSender.last();
        assertThat(sent.email()).isEqualTo("bob@example.com");
        assertThat(sent.link()).contains("token=");

        User stored = userRepository.findByUsername("bob").orElseThrow();
        assertThat(stored.getEmail()).isEqualTo("bob@example.com");
        assertThat(stored.isEmailVerified()).isFalse();
    }

    @Test
    void registerRejectsDuplicateUsername() {
        restTemplate.postForEntity(
            baseUrl() + "/auth/user-register",
            new UserRegisterRequest("carol", "S3cret-Password!", "Carol", null),
            LoginResponse.class
        );

        ResponseEntity<String> dup = restTemplate.postForEntity(
            baseUrl() + "/auth/user-register",
            new UserRegisterRequest("Carol", "Other-Password9!", "Carol Two", null),
            String.class
        );

        assertThat(dup.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void registerRejectsDuplicateEmail() {
        restTemplate.postForEntity(
            baseUrl() + "/auth/user-register",
            new UserRegisterRequest("dave", "S3cret-Password!", "Dave", "dave@example.com"),
            LoginResponse.class
        );

        ResponseEntity<String> dup = restTemplate.postForEntity(
            baseUrl() + "/auth/user-register",
            new UserRegisterRequest("dave2", "S3cret-Password!", "Dave Two", "DAVE@example.com"),
            String.class
        );

        assertThat(dup.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void userLoginWithUsernameAndPasswordReturnsToken() {
        register("erin", "S3cret-Password!", "Erin", null);

        ResponseEntity<LoginResponse> response = restTemplate.postForEntity(
            baseUrl() + "/auth/user-login",
            new UserLoginRequest("erin", "S3cret-Password!"),
            LoginResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().token()).isNotBlank();
    }

    @Test
    void userLoginWithWrongPasswordIsRejected() {
        register("frank", "S3cret-Password!", "Frank", null);

        ResponseEntity<String> response = restTemplate.postForEntity(
            baseUrl() + "/auth/user-login",
            new UserLoginRequest("frank", "wrong-password"),
            String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void userLoginWithUnknownIdentifierIsRejected() {
        ResponseEntity<String> response = restTemplate.postForEntity(
            baseUrl() + "/auth/user-login",
            new UserLoginRequest("nobody", "whatever12"),
            String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void loginByEmailIsRejectedUntilVerifiedThenSucceeds() {
        recordingEmailSender.clear();
        register("grace", "S3cret-Password!", "Grace", "grace@example.com");

        ResponseEntity<String> before = restTemplate.postForEntity(
            baseUrl() + "/auth/user-login",
            new UserLoginRequest("grace@example.com", "S3cret-Password!"),
            String.class
        );
        assertThat(before.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);

        String token = recordingEmailSender.tokenFromLastLink();
        ResponseEntity<Void> verify = restTemplate.postForEntity(
            baseUrl() + "/auth/verify-email",
            new VerifyEmailRequest(token),
            Void.class
        );
        assertThat(verify.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        ResponseEntity<LoginResponse> after = restTemplate.postForEntity(
            baseUrl() + "/auth/user-login",
            new UserLoginRequest("Grace@Example.com", "S3cret-Password!"),
            LoginResponse.class
        );
        assertThat(after.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(after.getBody().token()).isNotBlank();
    }

    @Test
    void verifyEmailRejectsUnknownToken() {
        ResponseEntity<String> response = restTemplate.postForEntity(
            baseUrl() + "/auth/verify-email",
            new VerifyEmailRequest("not-a-real-token"),
            String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void verifyEmailRejectsAlreadyConsumedToken() {
        recordingEmailSender.clear();
        register("heidi", "S3cret-Password!", "Heidi", "heidi@example.com");
        String token = recordingEmailSender.tokenFromLastLink();

        restTemplate.postForEntity(baseUrl() + "/auth/verify-email", new VerifyEmailRequest(token), Void.class);

        ResponseEntity<String> second = restTemplate.postForEntity(
            baseUrl() + "/auth/verify-email",
            new VerifyEmailRequest(token),
            String.class
        );
        assertThat(second.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void resendVerificationIssuesAFreshTokenAndInvalidatesTheOld() {
        recordingEmailSender.clear();
        register("ivan", "S3cret-Password!", "Ivan", "ivan@example.com");
        String firstToken = recordingEmailSender.tokenFromLastLink();

        ResponseEntity<Void> resend = restTemplate.postForEntity(
            baseUrl() + "/auth/resend-verification",
            new ResendVerificationRequest("ivan", "S3cret-Password!"),
            Void.class
        );
        assertThat(resend.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        String secondToken = recordingEmailSender.tokenFromLastLink();
        assertThat(secondToken).isNotEqualTo(firstToken);

        ResponseEntity<String> oldTokenVerify = restTemplate.postForEntity(
            baseUrl() + "/auth/verify-email",
            new VerifyEmailRequest(firstToken),
            String.class
        );
        assertThat(oldTokenVerify.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

        ResponseEntity<Void> newTokenVerify = restTemplate.postForEntity(
            baseUrl() + "/auth/verify-email",
            new VerifyEmailRequest(secondToken),
            Void.class
        );
        assertThat(newTokenVerify.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
    }

    @Test
    void resendVerificationWithWrongPasswordIsRejected() {
        register("judy", "S3cret-Password!", "Judy", "judy@example.com");

        ResponseEntity<String> response = restTemplate.postForEntity(
            baseUrl() + "/auth/resend-verification",
            new ResendVerificationRequest("judy", "wrong-password"),
            String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void userLoginLinkRequestForVerifiedUserSendsMailAndConsumeReturnsToken() {
        recordingEmailSender.clear();
        register("kim", "S3cret-Password!", "Kim", "kim@example.com");
        String verifyToken = recordingEmailSender.tokenFromLastLink();
        restTemplate.postForEntity(baseUrl() + "/auth/verify-email", new VerifyEmailRequest(verifyToken), Void.class);

        recordingEmailSender.clear();
        ResponseEntity<Void> requested = restTemplate.postForEntity(
            baseUrl() + "/auth/user-login-link/request",
            new RequestUserLoginLinkRequest("kim@example.com"),
            Void.class
        );
        assertThat(requested.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        String loginToken = recordingEmailSender.tokenFromLastLink();

        ResponseEntity<LoginResponse> consumed = restTemplate.postForEntity(
            baseUrl() + "/auth/user-login-link/consume",
            new LoginLinkConsumeRequest(loginToken),
            LoginResponse.class
        );
        assertThat(consumed.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(consumed.getBody().token()).isNotBlank();
    }

    @Test
    void userLoginLinkRequestForUnknownOrUnverifiedEmailStillReturnsNoContentAndSendsNoMail() {
        register("liam", "S3cret-Password!", "Liam", "liam@example.com"); // email left unverified
        recordingEmailSender.clear();

        ResponseEntity<Void> unverified = restTemplate.postForEntity(
            baseUrl() + "/auth/user-login-link/request",
            new RequestUserLoginLinkRequest("liam@example.com"),
            Void.class
        );
        assertThat(unverified.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        ResponseEntity<Void> unknown = restTemplate.postForEntity(
            baseUrl() + "/auth/user-login-link/request",
            new RequestUserLoginLinkRequest("ghost@example.com"),
            Void.class
        );
        assertThat(unknown.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        assertThat(recordingEmailSender.sent()).isEmpty();
    }

    @Test
    void userLoginLinkConsumeRejectsUnknownExpiredOrReusedToken() {
        ResponseEntity<String> unknown = restTemplate.postForEntity(
            baseUrl() + "/auth/user-login-link/consume",
            new LoginLinkConsumeRequest("not-a-real-token"),
            String.class
        );
        assertThat(unknown.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

        recordingEmailSender.clear();
        register("mia", "S3cret-Password!", "Mia", "mia@example.com");
        String verifyToken = recordingEmailSender.tokenFromLastLink();
        restTemplate.postForEntity(baseUrl() + "/auth/verify-email", new VerifyEmailRequest(verifyToken), Void.class);

        recordingEmailSender.clear();
        restTemplate.postForEntity(baseUrl() + "/auth/user-login-link/request", new RequestUserLoginLinkRequest("mia@example.com"), Void.class);
        String loginToken = recordingEmailSender.tokenFromLastLink();

        restTemplate.postForEntity(baseUrl() + "/auth/user-login-link/consume", new LoginLinkConsumeRequest(loginToken), LoginResponse.class);

        ResponseEntity<String> reused = restTemplate.postForEntity(
            baseUrl() + "/auth/user-login-link/consume",
            new LoginLinkConsumeRequest(loginToken),
            String.class
        );
        assertThat(reused.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void dashboardLoginLinkRequestAndConsumeReturnsStaffToken() {
        User staff = createEmployee("cashier-link-ok", "password123", StaffRole.CASHIER);
        staff.setEmail("cashier-link-ok@example.com");
        staff.setEmailVerified(true);
        userRepository.save(staff);

        recordingEmailSender.clear();
        ResponseEntity<Void> requested = restTemplate.postForEntity(
            baseUrl() + "/auth/dashboard/login-link/request",
            new RequestDashboardLoginLinkRequest("cashier-link-ok", defaultOrganization().getId()),
            Void.class
        );
        assertThat(requested.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        String loginToken = recordingEmailSender.tokenFromLastLink();

        ResponseEntity<LoginResponse> consumed = restTemplate.postForEntity(
            baseUrl() + "/auth/dashboard/login-link/consume",
            new LoginLinkConsumeRequest(loginToken),
            LoginResponse.class
        );
        assertThat(consumed.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(consumed.getBody().token()).isNotBlank();
    }

    @Test
    void dashboardLoginLinkRequestForWrongOrganizationSendsNoMail() {
        User staff = createEmployee("cashier-link-wrong-org", "password123", StaffRole.CASHIER);
        staff.setEmail("cashier-link-wrong-org@example.com");
        staff.setEmailVerified(true);
        userRepository.save(staff);

        Organization otherOrg = new Organization();
        otherOrg.setName("Other Org");
        otherOrg = organizationRepository.save(otherOrg);

        recordingEmailSender.clear();
        ResponseEntity<Void> requested = restTemplate.postForEntity(
            baseUrl() + "/auth/dashboard/login-link/request",
            new RequestDashboardLoginLinkRequest("cashier-link-wrong-org", otherOrg.getId()),
            Void.class
        );
        assertThat(requested.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(recordingEmailSender.sent()).isEmpty();
    }

    @Test
    void userLoginLinkCannotBeConsumedAtDashboardEndpointAndViceVersa() {
        User staff = createEmployee("cashier-link-cross", "password123", StaffRole.CASHIER);
        staff.setEmail("cashier-link-cross@example.com");
        staff.setEmailVerified(true);
        userRepository.save(staff);

        recordingEmailSender.clear();
        restTemplate.postForEntity(
            baseUrl() + "/auth/dashboard/login-link/request",
            new RequestDashboardLoginLinkRequest("cashier-link-cross", defaultOrganization().getId()),
            Void.class
        );
        String dashboardToken = recordingEmailSender.tokenFromLastLink();

        ResponseEntity<String> wrongEndpoint = restTemplate.postForEntity(
            baseUrl() + "/auth/user-login-link/consume",
            new LoginLinkConsumeRequest(dashboardToken),
            String.class
        );
        assertThat(wrongEndpoint.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

        recordingEmailSender.clear();
        register("nina", "S3cret-Password!", "Nina", "nina@example.com");
        String verifyToken = recordingEmailSender.tokenFromLastLink();
        restTemplate.postForEntity(baseUrl() + "/auth/verify-email", new VerifyEmailRequest(verifyToken), Void.class);

        recordingEmailSender.clear();
        restTemplate.postForEntity(baseUrl() + "/auth/user-login-link/request", new RequestUserLoginLinkRequest("nina@example.com"), Void.class);
        String userToken = recordingEmailSender.tokenFromLastLink();

        ResponseEntity<String> wrongEndpoint2 = restTemplate.postForEntity(
            baseUrl() + "/auth/dashboard/login-link/consume",
            new LoginLinkConsumeRequest(userToken),
            String.class
        );
        assertThat(wrongEndpoint2.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    private void register(String username, String password, String name, String email) {
        ResponseEntity<LoginResponse> response = restTemplate.postForEntity(
            baseUrl() + "/auth/user-register",
            new UserRegisterRequest(username, password, name, email),
            LoginResponse.class
        );
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }
}
