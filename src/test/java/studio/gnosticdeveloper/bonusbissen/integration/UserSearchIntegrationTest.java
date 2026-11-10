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
        createUser("srch-plain");
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
}
