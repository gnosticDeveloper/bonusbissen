package studio.gnosticdeveloper.bonusbissen.mercadopago;

import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Verifies the {@code x-signature} header Mercado Pago sends with every
 * webhook notification, per
 * <a href="https://www.mercadopago.com/developers/en/docs/your-integrations/notifications/webhooks#editor_6">...</a> --
 * manifest is {@code id:<dataId>;request-id:<x-request-id>;ts:<ts>;}, HMAC-SHA256'd
 * with the webhook secret from the MP dev panel, compared against the
 * header's {@code v1} part.
 *
 * This is the codebase's first unauthenticated inbound endpoint (see
 * MercadoPagoWebhookController) -- failing open here would let anyone flip
 * an invoice to PAID, so every failure mode (missing secret, malformed
 * header, mismatch) returns false.
 */
@Component
public class MercadoPagoSignatureVerifier {

    private final String webhookSecret;

    public MercadoPagoSignatureVerifier(@Value("${app.mercadopago.webhook-secret}") String webhookSecret) {
        this.webhookSecret = webhookSecret;
    }

    public boolean verify(String dataId, String xRequestId, String xSignatureHeader) {
        if ("unset".equals(webhookSecret) || dataId == null || xRequestId == null || xSignatureHeader == null) {
            return false;
        }

        Map<String, String> parts = parseSignatureHeader(xSignatureHeader);
        String ts = parts.get("ts");
        String v1 = parts.get("v1");
        if (ts == null || v1 == null) {
            return false;
        }

        String manifest = "id:" + dataId.toLowerCase(Locale.ROOT) + ";request-id:" + xRequestId + ";ts:" + ts + ";";
        String computed = hmacSha256Hex(manifest, webhookSecret);
        // Constant-time, so response timing doesn't leak how much of a guess matched.
        return MessageDigest.isEqual(
            computed.getBytes(StandardCharsets.UTF_8),
            v1.toLowerCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8)
        );
    }

    private Map<String, String> parseSignatureHeader(String header) {
        Map<String, String> parts = new HashMap<>();
        for (String piece : header.split(",")) {
            String[] kv = piece.split("=", 2);
            if (kv.length == 2) {
                parts.put(kv[0].trim(), kv[1].trim());
            }
        }
        return parts;
    }

    private String hmacSha256Hex(String data, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new IllegalStateException("HmacSHA256 should always be available", e);
        }
    }
}
