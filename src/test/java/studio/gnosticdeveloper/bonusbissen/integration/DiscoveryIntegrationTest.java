package studio.gnosticdeveloper.bonusbissen.integration;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import studio.gnosticdeveloper.bonusbissen.dto.request.GrantPointsRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.JoinPointProgramRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.BusinessResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.CityOption;
import studio.gnosticdeveloper.bonusbissen.dto.response.PagedResponse;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.entity.PointProgram;
import studio.gnosticdeveloper.bonusbissen.entity.Reward;
import studio.gnosticdeveloper.bonusbissen.entity.StaffRole;
import studio.gnosticdeveloper.bonusbissen.entity.Storefront;
import studio.gnosticdeveloper.bonusbissen.entity.User;

class DiscoveryIntegrationTest extends AbstractIntegrationTest {

    private static final ParameterizedTypeReference<PagedResponse<BusinessResponse>> PAGE = new ParameterizedTypeReference<>() {};
    private static final ParameterizedTypeReference<List<CityOption>> CITIES = new ParameterizedTypeReference<>() {};

    /** A self-contained org + physical storefront + program in its own city. */
    private record Fixture(Storefront storefront, PointProgram program) {}

    private Fixture seedBusiness(String slug, String city) {
        Organization org = new Organization();
        org.setName("Discover Org " + slug);
        org = organizationRepository.save(org);

        Storefront storefront = new Storefront();
        storefront.setOrganization(org);
        storefront.setName("Local " + slug);
        storefront.setAddress("Calle " + slug + " 100");
        storefront.setCity(city);
        storefront.setCategory("Cafetería");
        storefront.setColor("#123456");
        storefront = storefrontRepository.save(storefront);

        PointProgram program = new PointProgram();
        program.setOrganization(org);
        program.setName("Puntos " + slug);
        program.setUnitLabel("granos");
        program.getStorefronts().add(storefront);
        program = pointProgramRepository.save(program);

        return new Fixture(storefront, program);
    }

    private void reward(PointProgram program, String title, int cost) {
        Reward reward = new Reward();
        reward.setPointProgram(program);
        reward.setTitle(title);
        reward.setCostPoints(cost);
        rewardRepository.save(reward);
    }

    private User cashierFor(Storefront storefront, String username) {
        return createEmployee(username, "password123", StaffRole.CASHIER, storefront.getOrganization(), storefront);
    }

    @Test
    void discoverReturnsTheStorefrontWithAtMostThreeCheapestRewards() {
        Fixture fx = seedBusiness("alpha", "Villa Alpha, Córdoba");
        reward(fx.program(), "Barato", 10);
        reward(fx.program(), "Medio", 20);
        reward(fx.program(), "Caro", 30);
        reward(fx.program(), "Carísimo", 40);

        ResponseEntity<PagedResponse<BusinessResponse>> response = restTemplate.exchange(
            baseUrl() + "/discover/storefronts?city=Villa Alpha, Córdoba",
            HttpMethod.GET,
            null,
            PAGE
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        List<BusinessResponse> items = response.getBody().items();
        assertThat(items).hasSize(1);
        BusinessResponse card = items.get(0);
        assertThat(card.id()).isEqualTo(fx.storefront().getId());
        assertThat(card.name()).isEqualTo("Local alpha");
        assertThat(card.category()).isEqualTo("Cafetería");
        assertThat(card.color()).isEqualTo("#123456");
        assertThat(card.pointLabel()).isEqualTo("granos");
        assertThat(card.points()).isZero();
        assertThat(card.address().street()).isEqualTo("Calle alpha 100");
        assertThat(card.rewards()).hasSize(3);
        assertThat(card.rewards().get(0).costPoints()).isEqualTo(10);
        assertThat(card.rewards().get(2).costPoints()).isEqualTo(30);
    }

    @Test
    void discoverCityFilterExcludesOtherCities() {
        seedBusiness("beta", "Ciudad Beta, Santa Fe");

        ResponseEntity<PagedResponse<BusinessResponse>> match = restTemplate.exchange(
            baseUrl() + "/discover/storefronts?city=Ciudad Beta, Santa Fe",
            HttpMethod.GET,
            null,
            PAGE
        );
        assertThat(match.getBody().items()).extracting(BusinessResponse::name).contains("Local beta");

        ResponseEntity<PagedResponse<BusinessResponse>> miss = restTemplate.exchange(
            baseUrl() + "/discover/storefronts?city=Nowhere, Noprovince",
            HttpMethod.GET,
            null,
            PAGE
        );
        assertThat(miss.getBody().items()).extracting(BusinessResponse::name).doesNotContain("Local beta");
    }

    @Test
    void discoverPointsReflectTheViewersBalanceWhenTokenIsPresent() {
        Fixture fx = seedBusiness("gamma", "Pueblo Gamma, Córdoba");
        cashierFor(fx.storefront(), "cashier-discover-gamma");
        String cashierToken = loginEmployee("cashier-discover-gamma", "password123", fx.storefront().getOrganization().getId());
        User user = createUser("discover-gamma-user");
        String userToken = loginUser("discover-gamma-user");

        restTemplate.exchange(
            baseUrl() + "/point-programs/" + fx.program().getId() + "/members",
            HttpMethod.POST,
            authed(cashierToken, new JoinPointProgramRequest(user.getId())),
            Void.class
        );
        ResponseEntity<Void> grant = restTemplate.exchange(
            baseUrl() + "/users/grant",
            HttpMethod.POST,
            authed(cashierToken, new GrantPointsRequest(user.getId(), 75, null, fx.program().getId())),
            Void.class
        );
        assertThat(grant.getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<PagedResponse<BusinessResponse>> response = restTemplate.exchange(
            baseUrl() + "/discover/storefronts?city=Pueblo Gamma, Córdoba",
            HttpMethod.GET,
            authed(userToken),
            PAGE
        );

        assertThat(response.getBody().items()).hasSize(1);
        assertThat(response.getBody().items().get(0).points()).isEqualTo(75);
    }

    @Test
    void citiesListsCitiesThatHaveAnActiveStorefront() {
        seedBusiness("delta", "Localidad Delta, Santa Fe");

        ResponseEntity<List<CityOption>> response = restTemplate.exchange(
            baseUrl() + "/discover/cities",
            HttpMethod.GET,
            null,
            CITIES
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody())
            .extracting(CityOption::name)
            .contains("Localidad Delta, Santa Fe");
    }

    @Test
    void discoverIsReachableWithoutAuthentication() {
        ResponseEntity<PagedResponse<BusinessResponse>> response = restTemplate.exchange(
            baseUrl() + "/discover/storefronts",
            HttpMethod.GET,
            null,
            PAGE
        );
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void storefrontWithNoActivePointProgramIsNotDiscoverable() {
        Organization org = new Organization();
        org.setName("Discover Org lonely");
        org = organizationRepository.save(org);

        Storefront storefront = new Storefront();
        storefront.setOrganization(org);
        storefront.setName("Local lonely");
        storefront.setAddress("Calle lonely 1");
        storefront.setCity("Solitude, Córdoba");
        storefrontRepository.save(storefront);

        ResponseEntity<PagedResponse<BusinessResponse>> response = restTemplate.exchange(
            baseUrl() + "/discover/storefronts?city=Solitude, Córdoba",
            HttpMethod.GET,
            null,
            PAGE
        );
        assertThat(response.getBody().items()).isEmpty();
    }
}
