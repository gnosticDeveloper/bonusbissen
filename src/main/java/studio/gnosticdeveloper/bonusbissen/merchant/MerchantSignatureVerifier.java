package studio.gnosticdeveloper.bonusbissen.merchant;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Duration;
import java.util.HexFormat;
import java.util.Locale;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Component;

/**
 * Verifies a merchant's request: {@code X-BB-Signature} must be the hex HMAC-SHA256, keyed with
 * the integration's secret, of {@code <X-BB-Timestamp> + "." + <raw request body>}. The timestamp
 * (epoch seconds) must be within {@link #TOLERANCE} of now so a captured request can't be
 * replayed later. Every failure mode returns false.
 */
@Component
public class MerchantSignatureVerifier {

    static final Duration TOLERANCE = Duration.ofMinutes(5);

    private final Clock clock;

    public MerchantSignatureVerifier() {
        this.clock = Clock.systemUTC();
    }

    public boolean verify(String secret, String timestamp, String signature, String rawBody) {
        if (secret == null || timestamp == null || signature == null || rawBody == null) {
            return false;
        }
        long seconds;
        try {
            seconds = Long.parseLong(timestamp.trim());
        } catch (NumberFormatException e) {
            return false;
        }
        if (Math.abs(clock.instant().getEpochSecond() - seconds) > TOLERANCE.toSeconds()) {
            return false;
        }
        String expected = sign(secret, timestamp.trim(), rawBody);
        return MessageDigest.isEqual(
            expected.getBytes(StandardCharsets.UTF_8),
            signature.trim().toLowerCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8)
        );
    }

    /** Exposed so tests and the integration docs use the exact same recipe. */
    public static String sign(String secret, String timestamp, String rawBody) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal((timestamp + "." + rawBody).getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("HmacSHA256 should always be available", e);
        }
    }
}
