package studio.gnosticdeveloper.bonusbissen.integration;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import studio.gnosticdeveloper.bonusbissen.dto.request.ClaimRewardRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.GrantPointsRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.BusinessResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.CityOption;
import studio.gnosticdeveloper.bonusbissen.dto.response.PagedResponse;
import studio.gnosticdeveloper.bonusbissen.entity.BillingCycle;
import studio.gnosticdeveloper.bonusbissen.entity.Invoice;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.entity.PaymentStatus;
import studio.gnosticdeveloper.bonusbissen.entity.PointProgram;
import studio.gnosticdeveloper.bonusbissen.entity.Reward;
import studio.gnosticdeveloper.bonusbissen.entity.StaffRole;
import studio.gnosticdeveloper.bonusbissen.entity.Storefront;
import studio.gnosticdeveloper.bonusbissen.entity.User;
import studio.gnosticdeveloper.bonusbissen.repository.InvoiceRepository;

/** An org with an unpaid invoice overdue beyond its grace tier can't award points and leaves discovery; reads and redeeming keep working. */
class SubscriptionEnforcementIntegrationTest extends AbstractIntegrationTest {

    private static final ParameterizedTypeReference<PagedResponse<BusinessResponse>> PAGE = new ParameterizedTypeReference<>() {};
    private static final ParameterizedTypeReference<List<CityOption>> CITIES = new ParameterizedTypeReference<>() {};

    @Autowired
    private InvoiceRepository invoiceRepository;

    private record Fixture(Organization org, Storefront storefront, String city, String cashierToken, User customer, String customerKey) {}

    private int seq = 0;

    private Fixture seed(String graceTier) {
        String slug = "sub" + System.nanoTime() + (seq++);
        Organization org = new Organization();
        org.setName("Sub Org " + slug);
        org.setGraceTier(graceTier);
        org = organizationRepository.save(org);

        PointProgram program = new PointProgram();
        program.setOrganization(org);
        program.setName("Puntos " + slug);
        program = pointProgramRepository.save(program);

        Storefront storefront = new Storefront();
        storefront.setOrganization(org);
        storefront.setName("Local " + slug);
        storefront.setAddress("Calle 1");
        storefront.setCity("Ciudad " + slug);
        storefront.setProvince("Córdoba");
        storefront.setCategory("Cafetería");
        storefront.setColor("#123456");
        storefront.setPointProgram(program);
        storefront = storefrontRepository.save(storefront);

        createEmployee("cashier-" + slug, TEST_USER_PASSWORD, StaffRole.CASHIER, org, storefront);
        String token = loginEmployee("cashier-" + slug, TEST_USER_PASSWORD, org.getId());
        String customerKey = "cust-" + slug;
        User customer = createUser(customerKey);
        joinProgram(customer.getId(), program);
        return new Fixture(org, storefront, "Ciudad " + slug + ", Córdoba", token, customer, customerKey);
    }

    private Invoice invoice(Organization org, int dueDaysAgo, PaymentStatus status) {
        Invoice invoice = new Invoice();
        invoice.setOrganization(org);
        invoice.setInvoiceNumber(invoiceRepository.nextInvoiceNumber());
        invoice.setBillingCycle(BillingCycle.MONTHLY);
        invoice.setDueAt(OffsetDateTime.now().minusDays(dueDaysAgo));
        invoice.setAmount(new BigDecimal("5000.00"));
        invoice.setCurrency("ARS");
        invoice.setLineItems(List.of());
        invoice.setPaymentStatus(status);
        return invoiceRepository.save(invoice);
    }

    private ResponseEntity<Map<String, Object>> grant(Fixture fx) {
        return restTemplate.exchange(baseUrl() + "/users/grant", HttpMethod.POST,
            authed(fx.cashierToken(), new GrantPointsRequest(fx.customer().getId(), 10, null)),
            new ParameterizedTypeReference<>() {});
    }

    private boolean discoverable(Fixture fx) {
        PagedResponse<BusinessResponse> page = restTemplate.exchange(
            baseUrl() + "/discover/storefronts?city=" + fx.city(), HttpMethod.GET, null, PAGE).getBody();
        return !page.items().isEmpty();
    }

    @Test
    void anOrgWithNoInvoicesIsNeverLapsed() {
        Fixture fx = seed("regular");

        assertThat(grant(fx).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(discoverable(fx)).isTrue();
    }

    @Test
    void anOverdueInvoiceWithinGraceStillAllowsGrantsAndDiscovery() {
        Fixture fx = seed("regular");
        invoice(fx.org(), 3, PaymentStatus.PENDING);

        assertThat(grant(fx).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(discoverable(fx)).isTrue();
    }

    @Test
    void anInvoiceOverdueBeyondGraceBlocksGrantsWith402AndHidesTheStorefront() {
        Fixture fx = seed("regular");
        invoice(fx.org(), 8, PaymentStatus.PENDING);

        ResponseEntity<Map<String, Object>> response = grant(fx);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.PAYMENT_REQUIRED);
        assertThat(response.getBody()).containsEntry("code", "SUBSCRIPTION_LAPSED");
        assertThat(discoverable(fx)).isFalse();
        assertThat(restTemplate.exchange(baseUrl() + "/discover/cities", HttpMethod.GET, null, CITIES).getBody())
            .noneMatch(c -> c.name().equals(fx.city()));
        // Read-only staff views keep working so the org can see what's going on.
        assertThat(restTemplate.exchange(baseUrl() + "/exchanges", HttpMethod.GET, authed(fx.cashierToken()), String.class)
            .getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void aLapsedBusinessesPagesAnswer402WithANeutralMessageButAHealthyOnesDont() {
        Fixture lapsed = seed("regular");
        invoice(lapsed.org(), 30, PaymentStatus.PENDING);
        Fixture healthy = seed("regular");

        for (String template : List.of("/discover/%s/business", "/discover/storefronts/%s")) {
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                baseUrl() + template.formatted(lapsed.storefront().getId()), HttpMethod.GET, null, new ParameterizedTypeReference<>() {});
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.PAYMENT_REQUIRED);
            assertThat(response.getBody()).containsEntry("code", "BUSINESS_UNAVAILABLE");
            assertThat(response.getBody().get("detail").toString()).doesNotContainIgnoringCase("factura").doesNotContainIgnoringCase("suscripci");
            assertThat(restTemplate.getForEntity(baseUrl() + template.formatted(healthy.storefront().getId()), String.class).getStatusCode())
                .isEqualTo(HttpStatus.OK);
        }
    }

    @Test
    void customersCannotStartAClaimAtALapsedBusiness() {
        Fixture fx = seed("regular");
        assertThat(grant(fx).getStatusCode()).isEqualTo(HttpStatus.OK);
        Reward reward = reward(fx);
        invoice(fx.org(), 30, PaymentStatus.PENDING);

        ResponseEntity<Map<String, Object>> blocked = restTemplate.exchange(baseUrl() + "/users/claim-reward", HttpMethod.POST,
            authed(loginUser(fx.customerKey()), new ClaimRewardRequest(fx.customer().getId(), reward.getId())), new ParameterizedTypeReference<>() {});
        assertThat(blocked.getStatusCode()).isEqualTo(HttpStatus.PAYMENT_REQUIRED);
        assertThat(blocked.getBody()).containsEntry("code", "BUSINESS_UNAVAILABLE");
    }

    @Test
    void aCustomerCanClaimAtAHealthyBusiness() {
        Fixture fx = seed("regular");
        assertThat(grant(fx).getStatusCode()).isEqualTo(HttpStatus.OK);
        Reward reward = reward(fx);
        Invoice paid = invoice(fx.org(), 30, PaymentStatus.PENDING);
        paid.setPaymentStatus(PaymentStatus.PAID);
        invoiceRepository.save(paid);

        assertThat(restTemplate.exchange(baseUrl() + "/users/claim-reward", HttpMethod.POST,
            authed(loginUser(fx.customerKey()), new ClaimRewardRequest(fx.customer().getId(), reward.getId())), String.class).getStatusCode())
            .isEqualTo(HttpStatus.OK);
    }

    private Reward reward(Fixture fx) {
        Reward reward = new Reward();
        reward.setPointProgram(fx.storefront().getPointProgram());
        reward.setTitle("Café");
        reward.setCostPoints(5);
        return rewardRepository.save(reward);
    }

    @Test
    void thePilotTierGetsALongerGracePeriod() {
        Fixture withinGrace = seed("pilot");
        invoice(withinGrace.org(), 20, PaymentStatus.PENDING);
        Fixture beyondGrace = seed("pilot");
        invoice(beyondGrace.org(), 31, PaymentStatus.PENDING);

        assertThat(grant(withinGrace).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(grant(beyondGrace).getStatusCode()).isEqualTo(HttpStatus.PAYMENT_REQUIRED);
    }

    @Test
    void payingTheInvoiceLiftsTheLock() {
        Fixture fx = seed("regular");
        Invoice overdue = invoice(fx.org(), 10, PaymentStatus.PENDING);
        assertThat(grant(fx).getStatusCode()).isEqualTo(HttpStatus.PAYMENT_REQUIRED);

        overdue.setPaymentStatus(PaymentStatus.PAID);
        invoiceRepository.save(overdue);

        assertThat(grant(fx).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(discoverable(fx)).isTrue();
    }

    @Test
    void aLapsedOrgDoesNotAffectAnotherOrg() {
        Fixture lapsed = seed("regular");
        invoice(lapsed.org(), 30, PaymentStatus.PENDING);
        Fixture healthy = seed("regular");

        assertThat(grant(healthy).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(discoverable(healthy)).isTrue();
    }
}
