package studio.gnosticdeveloper.bonusbissen.integration;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import studio.gnosticdeveloper.bonusbissen.dto.request.ApproveExchangeRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.ClaimRewardRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.ExchangeVerifyRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.GrantPointsRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.JoinPointProgramRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.BusinessResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.ClaimRewardResponse;
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
import studio.gnosticdeveloper.bonusbissen.service.SubscriptionGuard;

/** Edges of the lapse rules (see LapseSql) and of what a lapsed org may still do. */
class SubscriptionAdversarialIntegrationTest extends AbstractIntegrationTest {

    private static final ParameterizedTypeReference<PagedResponse<BusinessResponse>> PAGE = new ParameterizedTypeReference<>() {};

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Autowired
    private SubscriptionGuard subscriptionGuard;

    private record Fixture(Organization org, Storefront storefront, PointProgram program, String cashierToken, User customer, String customerKey) {}

    private int seq = 0;

    private Fixture seed() {
        String slug = "adv" + System.nanoTime() + (seq++);
        Organization org = new Organization();
        org.setName("Adv Org " + slug);
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
        restTemplate.exchange(baseUrl() + "/point-programs/" + program.getId() + "/members", HttpMethod.POST,
            authed(token, new JoinPointProgramRequest(customer.getId())), Void.class);
        return new Fixture(org, storefront, program, token, customer, customerKey);
    }

    private Invoice invoice(Organization org, Duration dueAgo, PaymentStatus status) {
        Invoice invoice = new Invoice();
        invoice.setOrganization(org);
        invoice.setInvoiceNumber(invoiceRepository.nextInvoiceNumber());
        invoice.setBillingCycle(BillingCycle.MONTHLY);
        invoice.setDueAt(OffsetDateTime.now().minus(dueAgo));
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

    private long discoverableTotal() {
        return restTemplate.exchange(baseUrl() + "/discover/storefronts?size=1", HttpMethod.GET, null, PAGE).getBody().totalElements();
    }

    @Test
    void theRegularGraceBoundaryFallsBetweenSevenDaysAndSevenDaysPlusAnHour() {
        Fixture justInside = seed();
        invoice(justInside.org(), Duration.ofDays(7).minusHours(1), PaymentStatus.PENDING);
        Fixture justOutside = seed();
        invoice(justOutside.org(), Duration.ofDays(7).plusHours(1), PaymentStatus.PENDING);

        assertThat(grant(justInside).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(grant(justOutside).getStatusCode()).isEqualTo(HttpStatus.PAYMENT_REQUIRED);
    }

    @Test
    void oneOverdueInvoiceAmongPaidOnesStillLapsesTheOrg() {
        Fixture fx = seed();
        invoice(fx.org(), Duration.ofDays(90), PaymentStatus.PAID);
        invoice(fx.org(), Duration.ofDays(60), PaymentStatus.PAID);
        invoice(fx.org(), Duration.ofDays(10), PaymentStatus.PENDING);

        assertThat(grant(fx).getStatusCode()).isEqualTo(HttpStatus.PAYMENT_REQUIRED);
    }

    @Test
    void anEndedSubscriptionOutranksAnOverdueInvoiceInTheErrorCode() {
        Fixture fx = seed();
        invoice(fx.org(), Duration.ofDays(30), PaymentStatus.PENDING);
        Organization org = organizationRepository.findById(fx.org().getId()).orElseThrow();
        org.setSubscriptionEndsAt(OffsetDateTime.now().minusMinutes(1));
        organizationRepository.save(org);

        ResponseEntity<Map<String, Object>> response = grant(fx);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.PAYMENT_REQUIRED);
        assertThat(response.getBody()).containsEntry("code", "SUBSCRIPTION_ENDED");
    }

    @Test
    void aRedemptionAlreadyPendingWhenTheOrgLapsesCanStillBeVerifiedAndApproved() {
        Fixture fx = seed();
        assertThat(grant(fx).getStatusCode()).isEqualTo(HttpStatus.OK);
        Reward reward = new Reward();
        reward.setPointProgram(fx.program());
        reward.setTitle("Café");
        reward.setCostPoints(5);
        reward = rewardRepository.save(reward);
        ClaimRewardResponse claim = restTemplate.exchange(baseUrl() + "/users/claim-reward", HttpMethod.POST,
            authed(loginUser(fx.customerKey()), new ClaimRewardRequest(fx.customer().getId(), reward.getId())), ClaimRewardResponse.class).getBody();

        invoice(fx.org(), Duration.ofDays(30), PaymentStatus.PENDING);

        ResponseEntity<Map<String, Object>> verified = restTemplate.exchange(baseUrl() + "/exchanges/verify", HttpMethod.POST,
            authed(fx.cashierToken(), new ExchangeVerifyRequest(claim.code())), new ParameterizedTypeReference<>() {});
        assertThat(verified.getStatusCode()).isEqualTo(HttpStatus.OK);
        UUID exchangeId = UUID.fromString(verified.getBody().get("id").toString());
        assertThat(restTemplate.exchange(baseUrl() + "/exchanges/approve", HttpMethod.POST,
            authed(fx.cashierToken(), new ApproveExchangeRequest(exchangeId)), Void.class).getStatusCode())
            .isEqualTo(HttpStatus.OK);
    }

    @Test
    void discoveryTotalsDropByExactlyTheLapsedOrgsStorefront() {
        Fixture fx = seed();
        long before = discoverableTotal();

        invoice(fx.org(), Duration.ofDays(30), PaymentStatus.PENDING);

        assertThat(discoverableTotal()).isEqualTo(before - 1);
    }

    @Test
    void anAdminCannotGrantPointsAtADeactivatedStorefront() {
        Fixture fx = seed();
        createEmployee("admin-" + fx.customerKey(), TEST_USER_PASSWORD, StaffRole.ADMIN, fx.org(), fx.storefront());
        String adminToken = loginEmployee("admin-" + fx.customerKey(), TEST_USER_PASSWORD, fx.org().getId());
        Storefront storefront = fx.storefront();
        storefront.setActive(false);
        storefrontRepository.save(storefront);

        ResponseEntity<Map<String, Object>> response = restTemplate.exchange(baseUrl() + "/users/grant", HttpMethod.POST,
            authed(adminToken, new GrantPointsRequest(fx.customer().getId(), 10, null)), new ParameterizedTypeReference<>() {});

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().get("detail").toString()).contains("desactivado");
    }

    @Test
    void anUnknownOrganizationIsNotLapsed() {
        assertThat(subscriptionGuard.isLapsed(UUID.randomUUID())).isFalse();
    }

    @Test
    void aCustomerCannotJoinALapsedBusinessesProgramByCallingTheApiDirectly() {
        Fixture fx = seed();
        invoice(fx.org(), Duration.ofDays(30), PaymentStatus.PENDING);
        User newcomer = createUser("newcomer-" + System.nanoTime());

        ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
            baseUrl() + "/users/me/storefronts/" + fx.storefront().getId() + "/point-programs", HttpMethod.POST,
            authed(loginUser(newcomer.getUsername())), new ParameterizedTypeReference<>() {});

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.PAYMENT_REQUIRED);
    }
}
