package studio.gnosticdeveloper.bonusbissen.controller;

import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import studio.gnosticdeveloper.bonusbissen.mercadopago.MercadoPagoApiException;
import studio.gnosticdeveloper.bonusbissen.mercadopago.MercadoPagoSignatureVerifier;
import studio.gnosticdeveloper.bonusbissen.mercadopago.MercadoPagoWebhookService;

/**
 * This app's first unauthenticated inbound endpoint -- Mercado Pago can't
 * carry a JWT, so {@code x-signature} verification is what stands in for
 * auth here (see MercadoPagoSignatureVerifier). Permitted in SecurityConfig.
 *
 * MP notifications arrive as JSON {@code {type, data: {id}}}; the resource id
 * can also show up as a {@code data.id} query param depending on topic/version,
 * so both are accepted.
 */
@RestController
@RequestMapping("/webhooks/mercadopago")
public class MercadoPagoWebhookController {

    private static final Logger log = LoggerFactory.getLogger(MercadoPagoWebhookController.class);

    private final MercadoPagoSignatureVerifier signatureVerifier;
    private final MercadoPagoWebhookService webhookService;

    public MercadoPagoWebhookController(MercadoPagoSignatureVerifier signatureVerifier, MercadoPagoWebhookService webhookService) {
        this.signatureVerifier = signatureVerifier;
        this.webhookService = webhookService;
    }

    @PostMapping
    public ResponseEntity<Void> receive(
        @RequestBody(required = false) Map<String, Object> body,
        @RequestParam(required = false, name = "data.id") String dataIdParam,
        @RequestParam(required = false) String type,
        @RequestHeader(value = "x-signature", required = false) String xSignature,
        @RequestHeader(value = "x-request-id", required = false) String xRequestId
    ) {
        String resolvedType = type;
        String dataId = dataIdParam;
        if (body != null) {
            if (resolvedType == null && body.get("type") != null) {
                resolvedType = body.get("type").toString();
            }
            if (dataId == null && body.get("data") instanceof Map<?, ?> dataMap && dataMap.get("id") != null) {
                dataId = dataMap.get("id").toString();
            }
        }

        log.info("Received Mercado Pago webhook (type={}, dataId={})", resolvedType, dataId);

        if (!signatureVerifier.verify(dataId, xRequestId, xSignature)) {
            log.warn("Rejected Mercado Pago webhook with invalid signature (type={}, dataId={})", resolvedType, dataId);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            webhookService.handle(resolvedType, dataId);
        } catch (MercadoPagoApiException e) {
            if (!e.isNotFound()) {
                return processingFailed(resolvedType, dataId, e);
            }
            // MP has no such resource (e.g. the dev panel's simulated notifications use a
            // fake id) -- a retry can never succeed, so acknowledge instead of 500ing.
            log.warn("Mercado Pago has no resource for webhook (type={}, dataId={}), ignoring: {}", resolvedType, dataId, e.getMessage());
        } catch (Exception e) {
            return processingFailed(resolvedType, dataId, e);
        }

        return ResponseEntity.ok().build();
    }

    /**
     * 500 on purpose: MP retries non-2xx on a bounded back-off schedule, and
     * that retry is the only recovery path -- there's no reconciliation job.
     * Retries are safe: payments are idempotent on MP's id (see
     * MercadoPagoWebhookService).
     */
    private ResponseEntity<Void> processingFailed(String resolvedType, String dataId, Exception e) {
        log.error("Failed to process Mercado Pago webhook (type={}, dataId={})", resolvedType, dataId, e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
}
