package studio.gnosticdeveloper.bonusbissen.integration;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.TestPropertySource;
import studio.gnosticdeveloper.bonusbissen.dto.response.PointsSummaryResponse;
import studio.gnosticdeveloper.bonusbissen.entity.StaffRole;
import studio.gnosticdeveloper.bonusbissen.entity.Storefront;
import studio.gnosticdeveloper.bonusbissen.entity.User;
import studio.gnosticdeveloper.bonusbissen.merchant.IntegrationCreateRequest;
import studio.gnosticdeveloper.bonusbissen.merchant.IntegrationResponse;
import studio.gnosticdeveloper.bonusbissen.merchant.MerchantSignatureVerifier;
import studio.gnosticdeveloper.bonusbissen.entity.UserPointProgram;
import studio.gnosticdeveloper.bonusbissen.repository.UserPointProgramRepository;

/** Real security chain, real HMAC, real DB: the merchant webhook is reachable without a JWT and credits exactly once. */
@TestPropertySource(properties = "app.merchant.encryption-key=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=")
class MerchantWebhookIntegrationTest extends AbstractIntegrationTest {

    private static final String WEBHOOK = "/webhooks/merchant";

    @Autowired
    private UserPointProgramRepository userPointProgramRepository;

    private IntegrationResponse integration;
    private Storefront onlineStorefront;
    private String adminToken;

    @BeforeEach
    void createIntegration() {
        String adminName = "merchant-admin-" + UUID.randomUUID().toString().substring(0, 8);
        createEmployee(adminName, "pw-12345678", StaffRole.ADMIN);
        adminToken = loginEmployee(adminName, "pw-12345678");
        onlineStorefront = new Storefront();
        onlineStorefront.setOrganization(defaultOrganization());
        onlineStorefront.setName("Tienda online " + UUID.randomUUID().toString().substring(0, 8));
        onlineStorefront.setOnline(true);
        onlineStorefront.setPointProgram(defaultProgram());
        onlineStorefront = storefrontRepository.save(onlineStorefront);
        ResponseEntity<IntegrationResponse> created = restTemplate.exchange(
            baseUrl() + "/integrations",
            HttpMethod.POST,
            authed(adminToken, new IntegrationCreateRequest("Tienda Test", onlineStorefront.getId(), new BigDecimal("0.01"), "ars")),
            IntegrationResponse.class
        );
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        integration = created.getBody();
    }

    private ResponseEntity<String> post(String secret, String keyId, String timestamp, String body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-BB-Key-Id", keyId);
        headers.set("X-BB-Timestamp", timestamp);
        headers.set("X-BB-Signature", MerchantSignatureVerifier.sign(secret, timestamp, body));
        return restTemplate.exchange(baseUrl() + WEBHOOK, HttpMethod.POST, new HttpEntity<>(body, headers), String.class);
    }

    private ResponseEntity<String> postValid(String orderId, String identifier, String amount) {
        String body = "{\"orderId\":\"" + orderId + "\",\"identifier\":\"" + identifier + "\",\"amount\":" + amount + ",\"currency\":\"ARS\"}";
        return post(integration.secret(), integration.keyId(), String.valueOf(Instant.now().getEpochSecond()), body);
    }

    private long totalPoints(String usernameKey) {
        PointsSummaryResponse summary = restTemplate
            .exchange(baseUrl() + "/exchanges/summary", HttpMethod.GET, authed(loginUser(usernameKey)), PointsSummaryResponse.class)
            .getBody();
        return summary.summary().totalPoints();
    }

    private static String json(String status, int points) {
        return "{\"status\":\"" + status + "\",\"points\":" + points + "}";
    }

    private String uniqueName(String prefix) {
        return prefix + UUID.randomUUID().toString().substring(0, 8);
    }

    @Test
    void creditsPointsAndJoinsTheShopperToTheProgram() {
        String name = uniqueName("shopper");
        User user = createUser(name);
        assertThat(userPointProgramRepository.existsByUser_IdAndPointProgram_Id(user.getId(), defaultProgram().getId())).isFalse();

        ResponseEntity<String> response = postValid("order-1", name, "12500.50");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(json("CREDITED", 125));
        assertThat(userPointProgramRepository.existsByUser_IdAndPointProgram_Id(user.getId(), defaultProgram().getId())).isTrue();
        assertThat(totalPoints(name)).isEqualTo(125);
    }

    @Test
    void shopperIsJoinedThroughTheIntegrationsOnlineStorefront() {
        String name = uniqueName("shopper");
        User user = createUser(name);

        postValid("order-sf", name, "1000");

        UserPointProgram membership = userPointProgramRepository.findAll().stream()
            .filter(m -> m.getUser().getId().equals(user.getId()))
            .findFirst().orElseThrow();
        assertThat(membership.getStorefront().getId()).isEqualTo(onlineStorefront.getId());
    }

    @Test
    void integrationRequiresAnOnlineStorefrontWithAProgram() {
        ResponseEntity<String> physical = restTemplate.exchange(
            baseUrl() + "/integrations", HttpMethod.POST,
            authed(adminToken, new IntegrationCreateRequest("Fisica", defaultStorefront().getId(), new BigDecimal("0.01"), "ARS")),
            String.class
        );
        assertThat(physical.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

        Storefront noProgram = new Storefront();
        noProgram.setOrganization(defaultOrganization());
        noProgram.setName("Sin programa " + UUID.randomUUID().toString().substring(0, 8));
        noProgram.setOnline(true);
        noProgram = storefrontRepository.save(noProgram);
        ResponseEntity<String> missingProgram = restTemplate.exchange(
            baseUrl() + "/integrations", HttpMethod.POST,
            authed(adminToken, new IntegrationCreateRequest("Sin programa", noProgram.getId(), new BigDecimal("0.01"), "ARS")),
            String.class
        );
        assertThat(missingProgram.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

        ResponseEntity<String> unknown = restTemplate.exchange(
            baseUrl() + "/integrations", HttpMethod.POST,
            authed(adminToken, new IntegrationCreateRequest("Desconocida", UUID.randomUUID(), new BigDecimal("0.01"), "ARS")),
            String.class
        );
        assertThat(unknown.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void retriedOrderIsCreditedOnlyOnce() {
        String name = uniqueName("shopper");
        createUser(name);

        postValid("order-dup", name, "1000");
        ResponseEntity<String> retry = postValid("order-dup", name, "1000");

        assertThat(retry.getBody()).isEqualTo(json("DUPLICATE", 10));
        assertThat(totalPoints(name)).isEqualTo(10);
    }

    @Test
    void unknownIdentifierIsUnmatchedAndNothingIsRecorded() {
        ResponseEntity<String> response = postValid("order-x", "nobody-" + UUID.randomUUID(), "1000");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(json("UNMATCHED", 0));
    }

    @Test
    void emailMatchesOnlyVerifiedAccounts() {
        String name = uniqueName("emailer");
        User user = createUser(name);
        String email = name + "@example.com";
        user.setEmail(email);
        userRepository.save(user);

        assertThat(postValid("order-e1", email.toUpperCase(), "1000").getBody()).isEqualTo(json("UNMATCHED", 0));

        user.setEmailVerified(true);
        userRepository.save(user);
        assertThat(postValid("order-e2", email.toUpperCase(), "1000").getBody()).isEqualTo(json("CREDITED", 10));
    }

    @Test
    void amountTooSmallForAPointIsAcknowledgedWithZero() {
        String name = uniqueName("shopper");
        createUser(name);

        assertThat(postValid("order-tiny", name, "50").getBody()).isEqualTo(json("CREDITED", 0));
        assertThat(totalPoints(name)).isZero();
    }

    @Test
    void rejectsBadSignatureUnknownKeyStaleTimestampAndRevokedKey() {
        String name = uniqueName("shopper");
        createUser(name);
        String now = String.valueOf(Instant.now().getEpochSecond());
        String body = "{\"orderId\":\"o\",\"identifier\":\"" + name + "\",\"amount\":1000,\"currency\":\"ARS\"}";

        assertThat(post("wrong-secret", integration.keyId(), now, body).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(post(integration.secret(), "bbk_unknown", now, body).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        String stale = String.valueOf(Instant.now().getEpochSecond() - 3600);
        assertThat(post(integration.secret(), integration.keyId(), stale, body).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);

        // A body altered after signing no longer matches.
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-BB-Key-Id", integration.keyId());
        headers.set("X-BB-Timestamp", now);
        headers.set("X-BB-Signature", MerchantSignatureVerifier.sign(integration.secret(), now, body));
        ResponseEntity<String> tampered = restTemplate.exchange(
            baseUrl() + WEBHOOK, HttpMethod.POST, new HttpEntity<>(body.replace("1000", "9999999"), headers), String.class
        );
        assertThat(tampered.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);

        ResponseEntity<Void> revoked = restTemplate.exchange(
            baseUrl() + "/integrations/" + integration.id(), HttpMethod.DELETE, authed(adminToken), Void.class
        );
        assertThat(revoked.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(postValid("order-after-revoke", name, "1000").getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(totalPoints(name)).isZero();
    }

    @Test
    void unknownSourceIsRejectedLikeAnyUnauthenticatedSender() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl() + "/webhooks/not-a-source", HttpMethod.POST, new HttpEntity<>("{}", headers), String.class
        );
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void currencyMismatchIsRejected() {
        String name = uniqueName("shopper");
        createUser(name);
        String body = "{\"orderId\":\"o-usd\",\"identifier\":\"" + name + "\",\"amount\":1000,\"currency\":\"USD\"}";

        ResponseEntity<String> response = post(integration.secret(), integration.keyId(), String.valueOf(Instant.now().getEpochSecond()), body);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void secretIsOnlyShownAtCreationAndOnlyAdminsManageIntegrations() {
        assertThat(integration.secret()).startsWith("bbs_");

        ResponseEntity<List<IntegrationResponse>> listed = restTemplate.exchange(
            baseUrl() + "/integrations", HttpMethod.GET, authed(adminToken),
            new ParameterizedTypeReference<>() {}
        );
        assertThat(listed.getBody()).anyMatch(i -> i.id().equals(integration.id()));
        assertThat(listed.getBody()).allMatch(i -> i.secret() == null);

        String cashierName = uniqueName("cashier");
        createEmployee(cashierName, "pw-12345678", StaffRole.CASHIER);
        ResponseEntity<String> forbidden = restTemplate.exchange(
            baseUrl() + "/integrations", HttpMethod.GET, authed(loginEmployee(cashierName, "pw-12345678")), String.class
        );
        assertThat(forbidden.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }
}
