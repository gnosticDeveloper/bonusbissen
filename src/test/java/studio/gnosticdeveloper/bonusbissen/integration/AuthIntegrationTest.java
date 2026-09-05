package studio.gnosticdeveloper.bonusbissen.integration;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import studio.gnosticdeveloper.bonusbissen.dto.request.LoginRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.ResendVerificationRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.UserLoginRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.UserRegisterRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.VerifyEmailRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.LoginResponse;
import studio.gnosticdeveloper.bonusbissen.entity.EmployeeRole;
import studio.gnosticdeveloper.bonusbissen.entity.User;

import static org.assertj.core.api.Assertions.assertThat;

class AuthIntegrationTest extends AbstractIntegrationTest {

    @Test
    void loginWithValidCredentialsReturnsToken() {
        createEmployee("cashier-auth-ok", "correct-password", EmployeeRole.CASHIER);

        ResponseEntity<LoginResponse> response = restTemplate.postForEntity(
            baseUrl() + "/auth/login",
            new LoginRequest("cashier-auth-ok", "correct-password"),
            LoginResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().token()).isNotBlank();
    }

    @Test
    void loginWithWrongPasswordIsRejected() {
        createEmployee("cashier-auth-wrong-pw", "correct-password", EmployeeRole.CASHIER);

        ResponseEntity<String> response = restTemplate.postForEntity(
            baseUrl() + "/auth/login",
            new LoginRequest("cashier-auth-wrong-pw", "wrong-password"),
            String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void loginWithUnknownUsernameIsRejected() {
        ResponseEntity<String> response = restTemplate.postForEntity(
            baseUrl() + "/auth/login",
            new LoginRequest("ghost-user", "whatever"),
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

    private void register(String username, String password, String name, String email) {
        ResponseEntity<LoginResponse> response = restTemplate.postForEntity(
            baseUrl() + "/auth/user-register",
            new UserRegisterRequest(username, password, name, email),
            LoginResponse.class
        );
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }
}
