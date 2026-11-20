package studio.gnosticdeveloper.bonusbissen.integration;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import studio.gnosticdeveloper.bonusbissen.dto.response.PagedResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.UserPointsResponse;
import studio.gnosticdeveloper.bonusbissen.entity.StaffRole;
import studio.gnosticdeveloper.bonusbissen.entity.User;

class UserSearchIntegrationTest extends AbstractIntegrationTest {

    private static final ParameterizedTypeReference<PagedResponse<UserPointsResponse>> PAGE = new ParameterizedTypeReference<>() {};

    private List<String> usernamesFound(String token, String term) {
        ResponseEntity<PagedResponse<UserPointsResponse>> response = restTemplate.exchange(
            baseUrl() + "/users?search=" + term, HttpMethod.GET, authed(token), PAGE);
        return response.getBody().items().stream().map(UserPointsResponse::username).toList();
    }

    @Test
    void adminFindsCashiersButNotOtherAdminsOfTheirOrg() {
        createEmployee("srch-admin-a", TEST_USER_PASSWORD, StaffRole.ADMIN);
        createEmployee("srch-admin-b", TEST_USER_PASSWORD, StaffRole.ADMIN);
        createEmployee("srch-cashier", TEST_USER_PASSWORD, StaffRole.CASHIER);
        User plain = createUser("srch-plain");
        joinProgram(plain.getId(), defaultProgram());
        String token = loginEmployee("srch-admin-a", TEST_USER_PASSWORD);

        assertThat(usernamesFound(token, "srch-")).contains("srch-cashier", "srch-plain")
            .doesNotContain("srch-admin-a", "srch-admin-b");
    }

    @Test
    void cashierDoesNotSeeOtherCashiersOfTheirOrg() {
        createEmployee("srch2-cashier-a", TEST_USER_PASSWORD, StaffRole.CASHIER);
        createEmployee("srch2-cashier-b", TEST_USER_PASSWORD, StaffRole.CASHIER);
        String token = loginEmployee("srch2-cashier-a", TEST_USER_PASSWORD);

        assertThat(usernamesFound(token, "srch2-")).doesNotContain("srch2-cashier-a", "srch2-cashier-b");
    }

    private List<UserPointsResponse> found(String token, String term) {
        return restTemplate.exchange(baseUrl() + "/users?search=" + term, HttpMethod.GET, authed(token), PAGE)
            .getBody().items();
    }

    /** B4: people with no tie to the organization are not browsable by partial text. */
    @Test
    void partialSearchOnlyReachesTheOrganizationsOwnMembers() {
        createEmployee("srch3-admin", TEST_USER_PASSWORD, StaffRole.ADMIN);
        User member = createUser("srch3-member");
        joinProgram(member.getId(), defaultProgram());
        createUser("srch3-outsider");
        String token = loginEmployee("srch3-admin", TEST_USER_PASSWORD);

        assertThat(usernamesFound(token, "srch3-")).contains("srch3-member").doesNotContain("srch3-outsider");
    }

    /** B4: an admin can still find a new hire to add as cashier by their exact username, without their email. */
    @Test
    void outsiderIsFoundByExactUsernameWithoutTheirEmail() {
        createEmployee("srch4-admin", TEST_USER_PASSWORD, StaffRole.ADMIN);
        User outsider = createUser("srch4-newhire");
        outsider.setEmail("srch4-newhire@example.com");
        outsider.setEmailVerified(true);
        userRepository.save(outsider);
        String token = loginEmployee("srch4-admin", TEST_USER_PASSWORD);

        List<UserPointsResponse> results = found(token, "SRCH4-NEWHIRE");

        assertThat(results).singleElement().satisfies(result -> {
            assertThat(result.username()).isEqualTo("srch4-newhire");
            assertThat(result.email()).isNull();
        });
    }

    /** B4: exact email works for outsiders only when it is verified -- an unverified address proves nothing. */
    @Test
    void outsiderIsFoundByExactVerifiedEmailOnly() {
        createEmployee("srch5-admin", TEST_USER_PASSWORD, StaffRole.ADMIN);
        User verified = createUser("srch5-verified");
        verified.setEmail("srch5-verified@example.com");
        verified.setEmailVerified(true);
        userRepository.save(verified);
        User unverified = createUser("srch5-unverified");
        unverified.setEmail("srch5-unverified@example.com");
        userRepository.save(unverified);
        String token = loginEmployee("srch5-admin", TEST_USER_PASSWORD);

        assertThat(usernamesFound(token, "srch5-verified@example.com")).containsExactly("srch5-verified");
        assertThat(usernamesFound(token, "srch5-unverified@example.com")).isEmpty();
    }
}
