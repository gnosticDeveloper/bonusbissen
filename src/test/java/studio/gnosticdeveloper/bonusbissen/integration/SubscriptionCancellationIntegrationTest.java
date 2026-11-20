package studio.gnosticdeveloper.bonusbissen.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import studio.gnosticdeveloper.bonusbissen.dto.request.GrantPointsRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.BusinessResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.OrganizationResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.PagedResponse;
import studio.gnosticdeveloper.bonusbissen.entity.BillingCycle;
import studio.gnosticdeveloper.bonusbissen.entity.BillingPlan;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.entity.PointProgram;
import studio.gnosticdeveloper.bonusbissen.entity.StaffRole;
import studio.gnosticdeveloper.bonusbissen.entity.Storefront;
import studio.gnosticdeveloper.bonusbissen.entity.User;
import studio.gnosticdeveloper.bonusbissen.mercadopago.MercadoPagoClient;
import studio.gnosticdeveloper.bonusbissen.repository.BillingPlanRepository;
import studio.gnosticdeveloper.bonusbissen.service.InvoiceService;
import studio.gnosticdeveloper.bonusbissen.service.InvoiceService.SubscriptionEndedException;

/**
 * The whole cancel lifecycle against the real chain and DB, with only MercadoPagoClient mocked:
 * cancelling keeps access until the paid period ends, stops invoicing, locks once it has run
 * out, and a new authorized subscription (webhook) restores everything.
 */
@TestPropertySource(properties = "app.mercadopago.webhook-secret=cancel-test-secret")
class SubscriptionCancellationIntegrationTest extends AbstractIntegrationTest {

    private static final ParameterizedTypeReference<PagedResponse<BusinessResponse>> PAGE = new ParameterizedTypeReference<>() {};

    @MockitoBean
    private MercadoPagoClient mercadoPagoClient;

    @Autowired
    private BillingPlanRepository billingPlanRepository;

    @Autowired
    private InvoiceService invoiceService;

    private record Fixture(Organization org, Storefront storefront, String city, String adminToken, User customer, String preapprovalId) {}

    private Fixture seed(String preapprovalStatus) {
        String slug = "cancel" + UUID.randomUUID().toString().substring(0, 8);
        BillingPlan plan = new BillingPlan();
        plan.setName("Plan " + slug);
        plan.setPrice(new BigDecimal("5000.00"));
        plan.setCurrency("ARS");
        plan = billingPlanRepository.save(plan);

        Organization org = new Organization();
        org.setName("Cancel Org " + slug);
        org.setBillingPlan(plan);
        org.setBillingCycle(BillingCycle.MONTHLY);
        org.setNextInvoiceDueAt(OffsetDateTime.now().plusDays(10));
        String preapprovalId = "preapproval-" + slug;
        org.setMercadoPagoPreapprovalId(preapprovalId);
        org.setMercadoPagoPreapprovalStatus(preapprovalStatus);
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

        createEmployee("admin-" + slug, TEST_USER_PASSWORD, StaffRole.ADMIN, org, storefront);
        String token = loginEmployee("admin-" + slug, TEST_USER_PASSWORD, org.getId());
        User customer = createUser("cust-" + slug);
        joinProgram(customer.getId(), program);
        return new Fixture(org, storefront, "Ciudad " + slug + ", Córdoba", token, customer, preapprovalId);
    }

    private ResponseEntity<Map<String, Object>> grant(Fixture fx) {
        return restTemplate.exchange(baseUrl() + "/users/grant", HttpMethod.POST,
            authed(fx.adminToken(), new GrantPointsRequest(fx.customer().getId(), 10, null)), new ParameterizedTypeReference<>() {});
    }

    private boolean discoverable(Fixture fx) {
        return !restTemplate.exchange(baseUrl() + "/discover/storefronts?city=" + fx.city(), HttpMethod.GET, null, PAGE).getBody().items().isEmpty();
    }

    private Organization reload(Fixture fx) {
        return organizationRepository.findById(fx.org().getId()).orElseThrow();
    }

    private void postSignedPreapprovalNotification(String preapprovalId) {
        String requestId = "req-" + UUID.randomUUID();
        String ts = "1700000000";
        String signature;
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec("cancel-test-secret".getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            String manifest = "id:" + preapprovalId.toLowerCase() + ";request-id:" + requestId + ";ts:" + ts + ";";
            signature = HexFormat.of().formatHex(mac.doFinal(manifest.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        HttpHeaders headers = new HttpHeaders();
        headers.set("x-request-id", requestId);
        headers.set("x-signature", "ts=" + ts + ",v1=" + signature);
        ResponseEntity<Void> response = restTemplate.exchange(baseUrl() + "/webhooks/mercadopago", HttpMethod.POST,
            new HttpEntity<>(Map.of("type", "subscription_preapproval", "data", Map.of("id", preapprovalId)), headers), Void.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    private ResponseEntity<OrganizationResponse> cancel(Fixture fx) {
        return restTemplate.exchange(baseUrl() + "/organization/billing/subscription", HttpMethod.DELETE, authed(fx.adminToken()), OrganizationResponse.class);
    }

    @Test
    void cancellingKeepsAccessForThePaidPeriodAndStopsInvoicing() {
        Fixture fx = seed("authorized");
        OffsetDateTime paidThrough = reload(fx).getNextInvoiceDueAt();
        when(mercadoPagoClient.getPreapproval(fx.preapprovalId())).thenReturn(Map.of("status", "authorized"));
        when(mercadoPagoClient.updatePreapproval(any(), anyMap())).thenReturn(Map.of("status", "cancelled"));

        ResponseEntity<OrganizationResponse> response = cancel(fx);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(mercadoPagoClient).updatePreapproval(fx.preapprovalId(), Map.of("status", "cancelled"));
        assertThat(response.getBody().subscriptionEndsAt()).isCloseTo(paidThrough, within(1, ChronoUnit.SECONDS));
        assertThat(response.getBody().mercadoPagoSubscriptionStatus()).isEqualTo("cancelled");
        // still inside the paid period: nothing is locked
        assertThat(grant(fx).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(discoverable(fx)).isTrue();
        // and the job never bills it again
        assertThat(organizationRepository.findAllByBillingPlanIsNotNullAndSubscriptionEndsAtIsNullAndNextInvoiceDueAtLessThanEqual(OffsetDateTime.now().plusDays(60)))
            .extracting(Organization::getId).doesNotContain(fx.org().getId());
        assertThatThrownBy(() -> invoiceService.generateForOrganization(fx.org().getId(), OffsetDateTime.now().plusDays(60)))
            .isInstanceOf(SubscriptionEndedException.class);
    }

    @Test
    void cancellingTwiceKeepsTheFirstEndDate() {
        Fixture fx = seed("authorized");
        when(mercadoPagoClient.getPreapproval(fx.preapprovalId())).thenReturn(Map.of("status", "authorized"));
        when(mercadoPagoClient.updatePreapproval(any(), anyMap())).thenReturn(Map.of("status", "cancelled"));

        OffsetDateTime first = cancel(fx).getBody().subscriptionEndsAt();
        when(mercadoPagoClient.getPreapproval(fx.preapprovalId())).thenReturn(Map.of("status", "cancelled"));
        OffsetDateTime second = cancel(fx).getBody().subscriptionEndsAt();

        assertThat(second).isEqualTo(first);
    }

    @Test
    void onceThePaidPeriodHasRunOutTheOrgIsLockedWithAnEndedCodeAndHiddenFromCustomers() {
        Fixture fx = seed("authorized");
        when(mercadoPagoClient.getPreapproval(fx.preapprovalId())).thenReturn(Map.of("status", "authorized"));
        when(mercadoPagoClient.updatePreapproval(any(), anyMap())).thenReturn(Map.of("status", "cancelled"));
        cancel(fx);
        Organization org = reload(fx);
        org.setSubscriptionEndsAt(OffsetDateTime.now().minusMinutes(1));
        organizationRepository.save(org);

        ResponseEntity<Map<String, Object>> blocked = grant(fx);
        assertThat(blocked.getStatusCode()).isEqualTo(HttpStatus.PAYMENT_REQUIRED);
        assertThat(blocked.getBody()).containsEntry("code", "SUBSCRIPTION_ENDED");
        assertThat(discoverable(fx)).isFalse();
        ResponseEntity<Map<String, Object>> page = restTemplate.exchange(
            baseUrl() + "/discover/" + fx.storefront().getId() + "/business", HttpMethod.GET, null, new ParameterizedTypeReference<>() {});
        assertThat(page.getStatusCode()).isEqualTo(HttpStatus.PAYMENT_REQUIRED);
        assertThat(page.getBody()).containsEntry("code", "BUSINESS_UNAVAILABLE");
    }

    @Test
    void aNewAuthorizedSubscriptionAfterTheLockRestoresAccessAndRestartsBilling() {
        Fixture fx = seed("authorized");
        Organization org = reload(fx);
        org.setNextInvoiceDueAt(OffsetDateTime.now().minusDays(15));
        org.setSubscriptionEndsAt(OffsetDateTime.now().minusDays(15));
        org.setMercadoPagoPreapprovalId("new-preapproval-" + fx.preapprovalId());
        org.setMercadoPagoPreapprovalStatus("pending");
        organizationRepository.save(org);
        assertThat(grant(fx).getStatusCode()).isEqualTo(HttpStatus.PAYMENT_REQUIRED);
        when(mercadoPagoClient.getPreapproval("new-preapproval-" + fx.preapprovalId())).thenReturn(Map.of("status", "authorized"));

        OffsetDateTime before = OffsetDateTime.now();
        postSignedPreapprovalNotification("new-preapproval-" + fx.preapprovalId());

        Organization reloaded = reload(fx);
        assertThat(reloaded.getSubscriptionEndsAt()).isNull();
        assertThat(reloaded.getNextInvoiceDueAt()).isAfterOrEqualTo(before);
        assertThat(grant(fx).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(discoverable(fx)).isTrue();
    }

    @Test
    void cancellingOnMpsSideStartsTheSameRunDown() {
        Fixture fx = seed("authorized");
        OffsetDateTime paidThrough = reload(fx).getNextInvoiceDueAt();
        when(mercadoPagoClient.getPreapproval(fx.preapprovalId())).thenReturn(Map.of("status", "cancelled"));

        postSignedPreapprovalNotification(fx.preapprovalId());

        Organization reloaded = reload(fx);
        assertThat(reloaded.getMercadoPagoPreapprovalStatus()).isEqualTo("cancelled");
        assertThat(reloaded.getSubscriptionEndsAt()).isCloseTo(paidThrough, within(1, ChronoUnit.SECONDS));
    }

    @Test
    void aSubscriptionMpCancelsBeforeItWasEverAuthorizedLeavesAccessAlone() {
        Fixture fx = seed("pending");
        when(mercadoPagoClient.getPreapproval(fx.preapprovalId())).thenReturn(Map.of("status", "cancelled"));

        postSignedPreapprovalNotification(fx.preapprovalId());

        assertThat(reload(fx).getSubscriptionEndsAt()).isNull();
        assertThat(grant(fx).getStatusCode()).isEqualTo(HttpStatus.OK);
    }
}
