// package studio.gnosticdeveloper.bonusbissen.integration;

// import org.junit.jupiter.api.Test;
// import org.springframework.http.HttpStatus;
// import org.springframework.http.ResponseEntity;
// import studio.gnosticdeveloper.bonusbissen.dto.request.LoginRequest;
// import studio.gnosticdeveloper.bonusbissen.dto.response.LoginResponse;
// import studio.gnosticdeveloper.bonusbissen.entity.EmployeeRole;

// import static org.assertj.core.api.Assertions.assertThat;

// class AuthIntegrationTest extends AbstractIntegrationTest {

//     @Test
//     void loginWithValidCredentialsReturnsToken() {
//         createEmployee("cashier1", "correct-password", EmployeeRole.CASHIER);

//         ResponseEntity<LoginResponse> response = restTemplate.postForEntity(
//                 baseUrl() + "/auth/login",
//                 new LoginRequest("cashier1", "correct-password"),
//                 LoginResponse.class);

//         assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
//         assertThat(response.getBody()).isNotNull();
//         assertThat(response.getBody().token()).isNotBlank();
//         assertThat(response.getBody().role()).isEqualTo("CASHIER");
//     }

//     @Test
//     void loginWithWrongPasswordIsRejected() {
//         createEmployee("cashier2", "correct-password", EmployeeRole.CASHIER);

//         ResponseEntity<String> response = restTemplate.postForEntity(
//                 baseUrl() + "/auth/login",
//                 new LoginRequest("cashier2", "wrong-password"),
//                 String.class);

//         assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
//     }
// }
