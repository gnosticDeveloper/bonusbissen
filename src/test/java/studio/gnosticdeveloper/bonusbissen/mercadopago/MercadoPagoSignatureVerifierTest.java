package studio.gnosticdeveloper.bonusbissen.mercadopago;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;

/**
 * Exercises the real verifier against signatures computed the same way
 * Mercado Pago's docs specify (manifest {@code id:<dataId>;request-id:<id>;ts:<ts>;}
 * HMAC-SHA256'd with the shared secret) -- this is the only thing standing
 * in for auth on /webhooks/mercadopago, so every way it could wrongly accept
 * a request is worth covering explicitly.
 */
class MercadoPagoSignatureVerifierTest {

    private static final String SECRET = "test-webhook-secret";

    private String sign(String dataId, String requestId, String ts) {
        try {
            String manifest = "id:" + dataId.toLowerCase() + ";request-id:" + requestId + ";ts:" + ts + ";";
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(manifest.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    void acceptsACorrectlyComputedSignature() {
        MercadoPagoSignatureVerifier verifier = new MercadoPagoSignatureVerifier(SECRET);
        String v1 = sign("123456", "req-1", "1700000000");

        assertThat(verifier.verify("123456", "req-1", "ts=1700000000,v1=" + v1)).isTrue();
    }

    @Test
    void acceptsTheHeaderPartsInEitherOrder() {
        MercadoPagoSignatureVerifier verifier = new MercadoPagoSignatureVerifier(SECRET);
        String v1 = sign("123456", "req-1", "1700000000");

        assertThat(verifier.verify("123456", "req-1", "v1=" + v1 + ",ts=1700000000")).isTrue();
    }

    @Test
    void rejectsAWrongSecret() {
        MercadoPagoSignatureVerifier verifier = new MercadoPagoSignatureVerifier("a-different-secret");
        String v1 = sign("123456", "req-1", "1700000000");

        assertThat(verifier.verify("123456", "req-1", "ts=1700000000,v1=" + v1)).isFalse();
    }

    @Test
    void rejectsASignatureComputedForADifferentDataId() {
        MercadoPagoSignatureVerifier verifier = new MercadoPagoSignatureVerifier(SECRET);
        String v1 = sign("123456", "req-1", "1700000000");

        assertThat(verifier.verify("999999", "req-1", "ts=1700000000,v1=" + v1)).isFalse();
    }

    @Test
    void rejectsASignatureComputedForADifferentRequestId() {
        MercadoPagoSignatureVerifier verifier = new MercadoPagoSignatureVerifier(SECRET);
        String v1 = sign("123456", "req-1", "1700000000");

        assertThat(verifier.verify("123456", "req-2", "ts=1700000000,v1=" + v1)).isFalse();
    }

    @Test
    void failsClosedWhenTheSecretIsUnset() {
        MercadoPagoSignatureVerifier verifier = new MercadoPagoSignatureVerifier("unset");
        String v1 = sign("123456", "req-1", "1700000000");

        assertThat(verifier.verify("123456", "req-1", "ts=1700000000,v1=" + v1)).isFalse();
    }

    @Test
    void failsClosedWhenTheHeaderIsMissing() {
        MercadoPagoSignatureVerifier verifier = new MercadoPagoSignatureVerifier(SECRET);

        assertThat(verifier.verify("123456", "req-1", null)).isFalse();
    }

    @Test
    void failsClosedWhenDataIdOrRequestIdIsMissing() {
        MercadoPagoSignatureVerifier verifier = new MercadoPagoSignatureVerifier(SECRET);
        String v1 = sign("123456", "req-1", "1700000000");
        String header = "ts=1700000000,v1=" + v1;

        assertThat(verifier.verify(null, "req-1", header)).isFalse();
        assertThat(verifier.verify("123456", null, header)).isFalse();
    }

    @Test
    void failsClosedWhenTheHeaderIsMalformed() {
        MercadoPagoSignatureVerifier verifier = new MercadoPagoSignatureVerifier(SECRET);

        assertThat(verifier.verify("123456", "req-1", "not-a-valid-header")).isFalse();
    }
}
