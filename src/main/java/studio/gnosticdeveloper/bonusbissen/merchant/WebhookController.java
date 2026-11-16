package studio.gnosticdeveloper.bonusbissen.merchant;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Single inbound door for "an order was paid" notifications, whatever the payment source:
 * {@code POST /webhooks/{source}} is dispatched to the {@link PaymentEventSource} with that key.
 * Unauthenticated at the Spring Security layer (permitted in SecurityConfig) -- each source
 * authenticates its own sender. Unknown sources and unauthenticated senders both get a bare
 * 401, so the response doesn't reveal which sources or keys exist. Mercado Pago's subscription
 * billing webhook is a different flow with its own controller and takes precedence on its path.
 */
@RestController
@RequestMapping("/webhooks/{source}")
public class WebhookController {

    private static final Logger log = LoggerFactory.getLogger(WebhookController.class);

    private final Map<String, PaymentEventSource> sources;
    private final OnlinePurchaseService purchaseService;

    public WebhookController(List<PaymentEventSource> sources, OnlinePurchaseService purchaseService) {
        this.sources = sources.stream().collect(Collectors.toMap(PaymentEventSource::key, Function.identity()));
        this.purchaseService = purchaseService;
    }

    @PostMapping
    public ResponseEntity<PurchaseResponse> receive(
        @PathVariable String source,
        @RequestBody(required = false) String rawBody,
        @RequestHeader HttpHeaders headers
    ) {
        PaymentEventSource eventSource = sources.get(source);
        if (eventSource == null) {
            log.warn("Webhook for unknown source '{}'", source);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Optional<ReceivedPayment> payment;
        try {
            payment = eventSource.receive(new RawWebhook(rawBody, headers));
        } catch (WebhookRejectedException e) {
            log.warn("Rejected {} webhook: {}", source, e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (payment.isEmpty()) {
            return ResponseEntity.ok(new PurchaseResponse(PurchaseResponse.IGNORED, 0));
        }

        PurchaseResponse response = purchaseService.credit(payment.get().integrationId(), payment.get().order());
        log.info("{} webhook (integration={}, order={}) -> {}", source, payment.get().integrationId(), payment.get().order().externalOrderId(), response.status());
        return ResponseEntity.ok(response);
    }
}
