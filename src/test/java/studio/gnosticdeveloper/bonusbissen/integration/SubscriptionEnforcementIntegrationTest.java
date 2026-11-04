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
import studio.gnosticdeveloper.bonusbissen.dto.request.GrantPointsRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.JoinPointProgramRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.BusinessResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.CityOption;
import studio.gnosticdeveloper.bonusbissen.dto.response.PagedResponse;
import studio.gnosticdeveloper.bonusbissen.entity.BillingCycle;
import studio.gnosticdeveloper.bonusbissen.entity.Invoice;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.entity.PaymentStatus;
import studio.gnosticdeveloper.bonusbissen.entity.PointProgram;
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

    private record Fixture(Organization org, Storefront storefront, String city, String cashierToken, User customer) {}

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
        User customer = createUser("cust-" + slug);
        restTemplate.exchange(baseUrl() + "/point-programs/" + program.getId() + "/members", HttpMethod.POST,
            authed(token, new JoinPointProgramRequest(customer.getId())), Void.class);
        return new Fixture(org, storefront, "Ciudad " + slug + ", Córdoba", token, customer);
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
    void theByIdBusinessViewStaysReadable() {
        Fixture fx = seed("regular");
        invoice(fx.org(), 30, PaymentStatus.PENDING);

        assertThat(restTemplate.getForEntity(baseUrl() + "/discover/" + fx.storefront().getId() + "/business", BusinessResponse.class)
            .getStatusCode()).isEqualTo(HttpStatus.OK);
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
