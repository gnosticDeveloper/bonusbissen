package studio.gnosticdeveloper.bonusbissen.integration;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import studio.gnosticdeveloper.bonusbissen.dto.request.CustomerLoginRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.LoginRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.LoginResponse;
import studio.gnosticdeveloper.bonusbissen.entity.EmployeeRole;

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
    void customerLoginWithKnownPhoneReturnsToken() {
        createCustomer("+5493462000101");

        ResponseEntity<LoginResponse> response = restTemplate.postForEntity(
            baseUrl() + "/auth/customer-login",
            new CustomerLoginRequest("+5493462000101"),
            LoginResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().token()).isNotBlank();
    }

    @Test
    void customerLoginWithUnknownPhoneIsRejected() {
        ResponseEntity<String> response = restTemplate.postForEntity(
            baseUrl() + "/auth/customer-login",
            new CustomerLoginRequest("+5493462099999"),
            String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
