package studio.gnosticdeveloper.bonusbissen.mercadopago;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Thin wrapper around Mercado Pago's Subscriptions "no associated plan,
 * pending payment" flow: a {@code preapproval} created directly (no
 * {@code preapproval_plan_id}, no {@code card_token_id}) returns a hosted
 * {@code init_point} the payer visits to pick their own payment method --
 * the plan-associated flow (preapproval_plan_id + card_token_id, collected
 * via our own card form) was tried first and dropped, since Mercado Pago
 * requires {@code card_token_id} for that one regardless (confirmed against
 * the sandbox API and https://www.mercadopago.com/developers/es/docs/subscriptions/integration-configuration/subscription-associated-plan)
 * -- not what a redirect-only, no-card-handling integration wants.
 *
 * Responses are kept as Map<String,Object> rather than bound to typed DTOs.
 */
@Component
public class MercadoPagoClient {

    private static final Logger log = LoggerFactory.getLogger(MercadoPagoClient.class);

    /** MP wants ISO-8601 with milliseconds and an offset, e.g. 2026-11-27T10:00:00.000-03:00. */
    private static final DateTimeFormatter MP_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSXXX");

    private final RestClient restClient;

    public MercadoPagoClient(
        @Value("${app.mercadopago.base-url}") String baseUrl,
        @Value("${app.mercadopago.access-token}") String accessToken
    ) {
        this.restClient = RestClient.builder()
            .baseUrl(baseUrl)
            .defaultHeader("Authorization", "Bearer " + accessToken)
            .build();
    }

    /**
     * POST /preapproval -- returns the raw response body; callers read "id", "init_point", "status".
     * {@code startDate} null means MP charges as soon as the payer authorizes.
     */
    public Map<String, Object> createPreapproval(
        String reason,
        BigDecimal amount,
        String currency,
        String payerEmail,
        String externalReference,
        String backUrl,
        OffsetDateTime startDate
    ) {
        Map<String, Object> autoRecurring = new HashMap<>(Map.of(
            "frequency", 1,
            "frequency_type", "months",
            "transaction_amount", amount,
            "currency_id", currency
        ));
        if (startDate != null) {
            autoRecurring.put("start_date", startDate.format(MP_DATE_FORMAT));
        }
        Map<String, Object> body = Map.of(
            "reason", reason,
            "external_reference", externalReference,
            "payer_email", payerEmail,
            "back_url", backUrl,
            "status", "pending",
            "auto_recurring", autoRecurring
        );
        log.info("Creating Mercado Pago preapproval (externalReference={}, amount={} {}, startDate={})", externalReference, amount, currency, startDate);
        return exchange(HttpMethod.POST, "/preapproval", body);
    }

    /** GET /preapproval/{id} */
    public Map<String, Object> getPreapproval(String preapprovalId) {
        log.info("Fetching Mercado Pago preapproval {}", preapprovalId);
        return exchange(HttpMethod.GET, "/preapproval/" + preapprovalId, null);
    }

    /** PUT /preapproval/{id} -- partial update, e.g. {@code {status: cancelled}} or a new {@code auto_recurring.transaction_amount}. */
    public Map<String, Object> updatePreapproval(String preapprovalId, Map<String, Object> changes) {
        log.info("Updating Mercado Pago preapproval {} ({})", preapprovalId, changes.keySet());
        return exchange(HttpMethod.PUT, "/preapproval/" + preapprovalId, changes);
    }

    /** GET /authorized_payments/{id} -- the resource a "subscription_authorized_payment" webhook notification refers to. */
    public Map<String, Object> getAuthorizedPayment(String authorizedPaymentId) {
        log.info("Fetching Mercado Pago authorized payment {}", authorizedPaymentId);
        return exchange(HttpMethod.GET, "/authorized_payments/" + authorizedPaymentId, null);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> exchange(HttpMethod method, String path, Map<String, Object> body) {
        RestClient.RequestBodySpec request = restClient.method(method).uri(path);
        if (body != null) {
            request = request.body(body);
        }
        Map<String, Object> response = request
            .retrieve()
            .onStatus(HttpStatusCode::isError, (req, res) -> {
                String responseBody = new String(res.getBody().readAllBytes());
                throw new MercadoPagoApiException("Mercado Pago request to " + path + " failed with status " + res.getStatusCode() + ": " + responseBody, res.getStatusCode().value());
            })
            .body(Map.class);
        if (response == null) {
            throw new MercadoPagoApiException("Mercado Pago request to " + path + " returned an empty body");
        }
        log.info("Mercado Pago {} {} succeeded (id={}, status={})", method, path, response.get("id"), response.get("status"));
        return response;
    }
}
