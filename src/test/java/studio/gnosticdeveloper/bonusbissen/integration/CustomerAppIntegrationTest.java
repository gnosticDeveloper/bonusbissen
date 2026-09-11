package studio.gnosticdeveloper.bonusbissen.integration;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import studio.gnosticdeveloper.bonusbissen.dto.request.GrantPointsRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.PointsSummaryResponse;
import studio.gnosticdeveloper.bonusbissen.entity.Employee;
import studio.gnosticdeveloper.bonusbissen.entity.EmployeeRole;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.entity.PointProgram;
import studio.gnosticdeveloper.bonusbissen.entity.Storefront;
import studio.gnosticdeveloper.bonusbissen.entity.User;

class CustomerAppIntegrationTest extends AbstractIntegrationTest {

    private PointProgram seedProgram(String slug, String unitLabel) {
        Organization org = new Organization();
        org.setName("Summary Org " + slug);
        org = organizationRepository.save(org);

        Storefront storefront = new Storefront();
        storefront.setOrganization(org);
        storefront.setName("Local " + slug);
        storefront.setAddress("Calle " + slug + " 1");
        storefront.setCity("Ciudad " + slug + ", Córdoba");
        storefront = storefrontRepository.save(storefront);

        PointProgram program = new PointProgram();
        program.setOrganization(org);
        program.setName("Programa " + slug);
        program.setUnitLabel(unitLabel);
        program.getStorefronts().add(storefront);
        program = pointProgramRepository.save(program);

        Employee cashier = new Employee();
        cashier.setOrganization(org);
        cashier.setUsername("cashier-summary-" + slug);
        cashier.setPasswordHash(passwordEncoder.encode("password123"));
        cashier.setName("cashier-summary-" + slug);
        cashier.setRole(EmployeeRole.CASHIER);
        cashier.getStorefronts().add(storefront);
        employeeRepository.save(cashier);

        return program;
    }

    private void grant(String slug, UUID userId, UUID programId, int points) {
        String token = loginEmployee("cashier-summary-" + slug, "password123");
        ResponseEntity<Void> response = restTemplate.exchange(
            baseUrl() + "/users/grant",
            HttpMethod.POST,
            authed(token, new GrantPointsRequest(userId, points, null, programId)),
            Void.class
        );
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void summaryAggregatesBalanceAcrossEveryProgramTheUserBelongsTo() {
        PointProgram coffee = seedProgram("coffee", "granos");
        PointProgram books = seedProgram("books", "sellos");
        User user = createUser("summary-user");
        String userToken = loginUser("summary-user");

        grant("coffee", user.getId(), coffee.getId(), 120);
        grant("books", user.getId(), books.getId(), 30);

        ResponseEntity<PointsSummaryResponse> response = restTemplate.exchange(
            baseUrl() + "/exchanges/summary",
            HttpMethod.GET,
            authed(userToken),
            PointsSummaryResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        PointsSummaryResponse body = response.getBody();
        assertThat(body.summary().totalPoints()).isEqualTo(150);
        assertThat(body.memberships()).hasSize(2);
        assertThat(body.memberships())
            .anySatisfy(m -> {
                assertThat(m.id()).isEqualTo(coffee.getId().toString());
                assertThat(m.points()).isEqualTo(120);
                assertThat(m.pointLabel()).isEqualTo("granos");
                assertThat(m.memberSince()).isNotBlank();
                assertThat(m.org().name()).isEqualTo("Summary Org coffee");
            })
            .anySatisfy(m -> {
                assertThat(m.points()).isEqualTo(30);
                assertThat(m.pointLabel()).isEqualTo("sellos");
            });
    }

    @Test
    void summaryIsEmptyForAUserWithNoTransactions() {
        createUser("summary-empty-user");
        String userToken = loginUser("summary-empty-user");

        ResponseEntity<PointsSummaryResponse> response = restTemplate.exchange(
            baseUrl() + "/exchanges/summary",
            HttpMethod.GET,
            authed(userToken),
            PointsSummaryResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().summary().totalPoints()).isZero();
        assertThat(response.getBody().memberships()).isEmpty();
    }

    @Test
    void summaryRejectsEmployeeTokens() {
        createEmployee("cashier-summary-denied", "password123", EmployeeRole.CASHIER);
        String token = loginEmployee("cashier-summary-denied", "password123");

        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl() + "/exchanges/summary",
            HttpMethod.GET,
            authed(token),
            String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void resendVerificationForOwnAccountSendsMailAndRejectsWhenAlreadyVerified() {
        recordingEmailSender.clear();
        User user = createUser("resend-me-user");
        user.setEmail("resend-me@example.com");
        user.setEmailVerified(false);
        userRepository.save(user);
        String token = loginUser("resend-me-user");

        ResponseEntity<Void> ok = restTemplate.exchange(
            baseUrl() + "/users/me/resend-verification",
            HttpMethod.POST,
            authed(token),
            Void.class
        );
        assertThat(ok.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(recordingEmailSender.last().email()).isEqualTo("resend-me@example.com");

        user.setEmailVerified(true);
        userRepository.save(user);

        ResponseEntity<String> rejected = restTemplate.exchange(
            baseUrl() + "/users/me/resend-verification",
            HttpMethod.POST,
            authed(token),
            String.class
        );
        assertThat(rejected.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void deleteOwnAccountDeactivatesItAndBlocksLogin() {
        createUser("delete-me-user");
        String token = loginUser("delete-me-user");

        ResponseEntity<Void> deleted = restTemplate.exchange(
            baseUrl() + "/users/me",
            HttpMethod.DELETE,
            authed(token),
            Void.class
        );
        assertThat(deleted.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        User stored = userRepository.findByUsername("delete-me-user").orElseThrow();
        assertThat(stored.isActive()).isFalse();
    }
}
