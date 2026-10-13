package studio.gnosticdeveloper.bonusbissen.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtBuilder;
import io.jsonwebtoken.Jwts;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private final PrivateKey privateKey;
    private final PublicKey publicKey;
    private final long expirationMinutes;

    public JwtService(
            @Value("${app.jwt.private-key}") String privateKeyBase64,
            @Value("${app.jwt.public-key}") String publicKeyBase64,
            @Value("${app.jwt.expiration-minutes}") long expirationMinutes) {
        this.privateKey = loadPrivateKey(privateKeyBase64);
        this.publicKey = loadPublicKey(publicKeyBase64);
        this.expirationMinutes = expirationMinutes;
    }

    /** A minted access token paired with its own {@code jti}, so the caller can track it against a session for later targeted revocation. */
    public record Issued(String token, String jti) {}

    public Issued generateToken(UUID id, String username, String role) {
        return generateToken(id, username, role, null);
    }

    public Issued generateToken(UUID id, String username, String role, UUID storefrontId) {
        Instant now = Instant.now();
        String jti = UUID.randomUUID().toString();
        JwtBuilder builder = Jwts.builder()
            .id(jti)
            .subject(id.toString())
            .claim("username", username)
            .claim("role", role)
            .issuedAt(java.util.Date.from(now))
            .expiration(java.util.Date.from(now.plus(expirationMinutes, ChronoUnit.MINUTES)));
        if (storefrontId != null) {
            builder.claim("sf", storefrontId.toString());
        }
        String token = builder.signWith(privateKey, Jwts.SIG.ES256).compact();
        return new Issued(token, jti);
    }

    public Claims parseClaims(String token) {
        return Jwts.parser().verifyWith(publicKey).build().parseSignedClaims(token).getPayload();
    }

    /**
     * Base64-encoded X.509/SPKI DER of the verification key, for clients that
     * need to verify tokens themselves (e.g. other services, API consumers).
     */
    public String publicKeyBase64() {
        return Base64.getEncoder().encodeToString(publicKey.getEncoded());
    }

    private static PrivateKey loadPrivateKey(String base64) {
        try {
            KeyFactory keyFactory = KeyFactory.getInstance("EC");
            byte[] bytes = Base64.getDecoder().decode(base64);
            return keyFactory.generatePrivate(new PKCS8EncodedKeySpec(bytes));
        } catch (GeneralSecurityException | IllegalArgumentException e) {
            throw new IllegalStateException("Invalid app.jwt.private-key: expected base64-encoded PKCS8 EC key", e);
        }
    }

    private static PublicKey loadPublicKey(String base64) {
        try {
            KeyFactory keyFactory = KeyFactory.getInstance("EC");
            byte[] bytes = Base64.getDecoder().decode(base64);
            return keyFactory.generatePublic(new X509EncodedKeySpec(bytes));
        } catch (GeneralSecurityException | IllegalArgumentException e) {
            throw new IllegalStateException("Invalid app.jwt.public-key: expected base64-encoded X.509 EC key", e);
        }
    }
}
