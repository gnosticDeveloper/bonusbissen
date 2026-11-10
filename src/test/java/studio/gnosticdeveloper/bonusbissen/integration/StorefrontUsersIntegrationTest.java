package studio.gnosticdeveloper.bonusbissen.integration;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import studio.gnosticdeveloper.bonusbissen.dto.request.ApproveExchangeRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.ClaimRewardRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.GrantPointsRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.PagedResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.PendingExchangeResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.StorefrontUserResponse;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.entity.StaffRole;
import studio.gnosticdeveloper.bonusbissen.entity.Storefront;
import studio.gnosticdeveloper.bonusbissen.entity.User;

class StorefrontUsersIntegrationTest extends AbstractIntegrationTest {

    private static final ParameterizedTypeReference<PagedResponse<StorefrontUserResponse>> PAGE = new ParameterizedTypeReference<>() {};

    private ResponseEntity<PagedResponse<StorefrontUserResponse>> list(String token, Storefront storefront, String query) {
        return restTemplate.exchange(baseUrl() + "/storefronts/" + storefront.getId() + "/users" + query, HttpMethod.GET, authed(token), PAGE);
    }

    private void joinThroughStorefront(String usernameKey, Storefront storefront) {
        restTemplate.exchange(
            baseUrl() + "/users/me/storefronts/" + storefront.getId() + "/point-programs",
            HttpMethod.POST,
            authed(loginUser(usernameKey)),
            Void.class
        );
    }

    @Test
    void adminSeesUsersWhoJoinedThroughTheStorefrontWithTheirActivityThere() {
        createEmployee("sfu-admin", TEST_USER_PASSWORD, StaffRole.ADMIN);
        createEmployee("sfu-cashier", TEST_USER_PASSWORD, StaffRole.CASHIER);
        User member = createUser("sfu-member");
        createUser("sfu-bystander");
        User viaProgramId = createUser("sfu-program-only");
        joinThroughStorefront("sfu-member", defaultStorefront());
        joinProgram(viaProgramId.getId(), defaultProgram());

        ResponseEntity<Void> grant = restTemplate.exchange(
            baseUrl() + "/users/grant",
            HttpMethod.POST,
            authed(loginEmployee("sfu-cashier", TEST_USER_PASSWORD), new GrantPointsRequest(member.getId(), 40, null)),
            Void.class
        );
        assertThat(grant.getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<PagedResponse<StorefrontUserResponse>> response = list(loginEmployee("sfu-admin", TEST_USER_PASSWORD), defaultStorefront(), "?search=sfu-");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().items()).extracting(StorefrontUserResponse::username).containsExactly("sfu-member");
        StorefrontUserResponse row = response.getBody().items().get(0);
        assertThat(row.balance()).isEqualTo(40);
        assertThat(row.totalEarned()).isEqualTo(40);
        assertThat(row.totalRedeemed()).isZero();
        assertThat(row.lastActivityAt()).isNotNull();
    }

    @Test
    void paginatesAndReportsNoActivityForAUserWhoNeverTransacted() {
        createEmployee("sfu2-admin", TEST_USER_PASSWORD, StaffRole.ADMIN);
        for (int i = 0; i < 3; i++) {
            createUser("sfu2-user-" + i);
            joinThroughStorefront("sfu2-user-" + i, defaultStorefront());
        }

        PagedResponse<StorefrontUserResponse> page = list(loginEmployee("sfu2-admin", TEST_USER_PASSWORD), defaultStorefront(), "?search=sfu2-user&size=2&page=1").getBody();

        assertThat(page.totalElements()).isEqualTo(3);
        assertThat(page.totalPages()).isEqualTo(2);
        assertThat(page.items()).hasSize(1);
        assertThat(page.items().get(0).lastActivityAt()).isNull();
        assertThat(page.items().get(0).balance()).isZero();
    }

    @Test
    void cashiersAreRefused() {
        createEmployee("sfu3-cashier", TEST_USER_PASSWORD, StaffRole.CASHIER);

        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl() + "/storefronts/" + defaultStorefront().getId() + "/users",
            HttpMethod.GET,
            authed(loginEmployee("sfu3-cashier", TEST_USER_PASSWORD)),
            String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void adminCannotListAnotherOrganizationsStorefront() {
        createEmployee("sfu4-admin", TEST_USER_PASSWORD, StaffRole.ADMIN);
        Organization other = new Organization();
        other.setName("Other Org sfu4");
        other = organizationRepository.save(other);
        Storefront foreign = new Storefront();
        foreign.setOrganization(other);
        foreign.setName("Foreign");
        foreign.setOnline(true);
        foreign = storefrontRepository.save(foreign);

        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl() + "/storefronts/" + foreign.getId() + "/users",
            HttpMethod.GET,
            authed(loginEmployee("sfu4-admin", TEST_USER_PASSWORD)),
            String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void approvedRedemptionsCountAsRedeemedAtTheApprovingStorefront() {
        createEmployee("sfu5-admin", TEST_USER_PASSWORD, StaffRole.ADMIN);
        createEmployee("sfu5-cashier", TEST_USER_PASSWORD, StaffRole.CASHIER);
        String cashierToken = loginEmployee("sfu5-cashier", TEST_USER_PASSWORD);
        User member = createUser("sfu5-member");
        joinThroughStorefront("sfu5-member", defaultStorefront());
        restTemplate.exchange(baseUrl() + "/users/grant", HttpMethod.POST, authed(cashierToken, new GrantPointsRequest(member.getId(), 100, null)), Void.class);
        var reward = createReward("sfu5 reward", 30);
        restTemplate.exchange(
            baseUrl() + "/users/claim-reward", HttpMethod.POST, authed(loginUser("sfu5-member"), new ClaimRewardRequest(member.getId(), reward.getId())), String.class);
        List<PendingExchangeResponse> pending = restTemplate
            .exchange(baseUrl() + "/exchanges/pending/" + member.getId(), HttpMethod.GET, authed(cashierToken), new ParameterizedTypeReference<List<PendingExchangeResponse>>() {})
            .getBody();

        StorefrontUserResponse before = list(loginEmployee("sfu5-admin", TEST_USER_PASSWORD), defaultStorefront(), "?search=sfu5-").getBody().items().get(0);
        assertThat(before.totalRedeemed()).isZero();

        restTemplate.exchange(baseUrl() + "/exchanges/approve", HttpMethod.POST, authed(cashierToken, new ApproveExchangeRequest(pending.get(0).id())), Void.class);

        StorefrontUserResponse after = list(loginEmployee("sfu5-admin", TEST_USER_PASSWORD), defaultStorefront(), "?search=sfu5-").getBody().items().get(0);
        assertThat(after.totalRedeemed()).isEqualTo(30);
        assertThat(after.totalEarned()).isEqualTo(100);
        assertThat(after.balance()).isEqualTo(70);
    }
}
