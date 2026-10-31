package studio.gnosticdeveloper.bonusbissen.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import studio.gnosticdeveloper.bonusbissen.entity.BillingCycle;
import studio.gnosticdeveloper.bonusbissen.entity.BillingPlan;
import studio.gnosticdeveloper.bonusbissen.entity.Invoice;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.entity.PaymentStatus;
import studio.gnosticdeveloper.bonusbissen.mercadopago.MercadoPagoClient;
import studio.gnosticdeveloper.bonusbissen.repository.BillingPlanRepository;
import studio.gnosticdeveloper.bonusbissen.repository.InvoiceRepository;
import studio.gnosticdeveloper.bonusbissen.repository.MercadoPagoPaymentRepository;
import studio.gnosticdeveloper.bonusbissen.service.InvoiceService;

/**
 * End-to-end through the real Spring Security chain: this is the one test
 * confirming /webhooks/mercadopago is actually reachable without a JWT (the
 * app's first unauthenticated inbound endpoint) and that a real request gets
 * all the way to a committed DB write -- unit tests cover the branch logic,
 * this one would catch a wrong SecurityConfig matcher or the
 * @Transactional-on-self-invocation class of bug that slipped through the
 * first implementation pass.
 *
 * {@link MercadoPagoClient} is the only thing mocked -- everything else,
 * including the real HMAC signature check, runs as in production.
 */
@TestPropertySource(properties = "app.mercadopago.webhook-secret=integration-test-secret")
class MercadoPagoWebhookIntegrationTest extends AbstractIntegrationTest {

    private static final String WEBHOOK_SECRET = "integration-test-secret";

    @MockitoBean
    private MercadoPagoClient mercadoPagoClient;

    @Autowired
    private BillingPlanRepository billingPlanRepository;

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Autowired
    private MercadoPagoPaymentRepository mercadoPagoPaymentRepository;

    @Autowired
    private InvoiceService invoiceService;

    private String sign(String dataId, String requestId, String ts) {
        try {
            String manifest = "id:" + dataId.toLowerCase() + ";request-id:" + requestId + ";ts:" + ts + ";";
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(WEBHOOK_SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(manifest.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private ResponseEntity<Void> postNotification(String type, String dataId, String requestId, String signatureHeader) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("x-request-id", requestId);
        if (signatureHeader != null) {
            headers.set("x-signature", signatureHeader);
        }
        Map<String, Object> body = Map.of("type", type, "data", Map.of("id", dataId));
        // Deliberately no Authorization header -- this is the point of the test.
        return restTemplate.exchange(baseUrl() + "/webhooks/mercadopago", HttpMethod.POST, new HttpEntity<>(body, headers), Void.class);
    }

    private Organization createSubscribedOrg() {
        BillingPlan plan = new BillingPlan();
        plan.setName("Plan Mensual");
        plan.setPrice(new BigDecimal("5000.00"));
        plan.setCurrency("ARS");
        plan = billingPlanRepository.save(plan);

        Organization org = new Organization();
        org.setName("Webhook Test Org " + UUID.randomUUID());
        org.setBillingPlan(plan);
        org.setBillingCycle(BillingCycle.MONTHLY);
        org.setNextInvoiceDueAt(OffsetDateTime.now().minusHours(1));
        org.setMercadoPagoPreapprovalId("preapproval-" + UUID.randomUUID());
        return organizationRepository.save(org);
    }

    private Invoice createPendingInvoice(Organization org) {
        Invoice invoice = new Invoice();
        invoice.setOrganization(org);
        invoice.setInvoiceNumber(invoiceRepository.nextInvoiceNumber());
        invoice.setBillingCycle(BillingCycle.MONTHLY);
        invoice.setDueAt(OffsetDateTime.now());
        invoice.setAmount(new BigDecimal("5000.00"));
        invoice.setCurrency("ARS");
        invoice.setLineItems(List.of());
        return invoiceRepository.save(invoice);
    }

    private void stubApprovedPayment(String authorizedPaymentId, Organization org) {
        when(mercadoPagoClient.getAuthorizedPayment(authorizedPaymentId)).thenReturn(Map.of(
            "status", "processed",
            "preapproval_id", org.getMercadoPagoPreapprovalId(),
            "transaction_amount", 5000.00,
            "currency_id", "ARS",
            "payment", Map.of("id", 1L, "status", "approved")
        ));
    }

    private ResponseEntity<Void> postSigned(String authorizedPaymentId) {
        String ts = "1700000000";
        String requestId = "req-" + UUID.randomUUID();
        String signature = "ts=" + ts + ",v1=" + sign(authorizedPaymentId, requestId, ts);
        return postNotification("subscription_authorized_payment", authorizedPaymentId, requestId, signature);
    }

    @Test
    void approvedPaymentWebhookIsAcceptedWithoutAuthAndMarksTheInvoicePaid() {
        Organization org = createSubscribedOrg();
        Invoice invoice = createPendingInvoice(org);
        String paymentId = "authorized-payment-" + UUID.randomUUID();
        stubApprovedPayment(paymentId, org);

        ResponseEntity<Void> response = postSigned(paymentId);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        Invoice reloaded = invoiceRepository.findById(invoice.getId()).orElseThrow();
        assertThat(reloaded.getPaymentStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(reloaded.getPaymentReference()).isEqualTo(paymentId);
        assertThat(reloaded.getPaidAt()).isNotNull();
    }

    @Test
    void aRepeatedNotificationDoesNotMarkTheNextInvoicePaid() {
        Organization org = createSubscribedOrg();
        Invoice first = createPendingInvoice(org);
        String paymentId = "authorized-payment-" + UUID.randomUUID();
        stubApprovedPayment(paymentId, org);

        postSigned(paymentId);
        Invoice second = createPendingInvoice(org);
        ResponseEntity<Void> repeat = postSigned(paymentId);

        assertThat(repeat.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(invoiceRepository.findById(first.getId()).orElseThrow().getPaymentStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(invoiceRepository.findById(second.getId()).orElseThrow().getPaymentStatus()).isEqualTo(PaymentStatus.PENDING);
    }

    @Test
    void aPaymentArrivingBeforeItsInvoiceIsAppliedWhenTheInvoiceIsGenerated() {
        Organization org = createSubscribedOrg();
        String paymentId = "authorized-payment-" + UUID.randomUUID();
        stubApprovedPayment(paymentId, org);

        postSigned(paymentId);
        assertThat(mercadoPagoPaymentRepository.findById(paymentId).orElseThrow().getInvoice()).isNull();

        Invoice generated = invoiceService.generateForOrganization(org.getId(), OffsetDateTime.now());

        Invoice reloaded = invoiceRepository.findById(generated.getId()).orElseThrow();
        assertThat(reloaded.getPaymentStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(reloaded.getPaymentReference()).isEqualTo(paymentId);
    }

    @Test
    void aForgedSignatureIsRejectedEvenThoughTheEndpointNeedsNoAuth() {
        ResponseEntity<Void> response = postNotification(
            "subscription_authorized_payment", "authorized-payment-1", "req-forged", "ts=1700000000,v1=0000000000000000000000000000000000000000000000000000000000000000"
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
