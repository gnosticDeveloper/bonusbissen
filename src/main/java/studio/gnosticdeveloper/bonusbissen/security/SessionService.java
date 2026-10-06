package studio.gnosticdeveloper.bonusbissen.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

/**
 * Redis-backed refresh-token sessions (issue #43): per-device session records,
 * rotate-on-refresh with replay detection, and two revocation primitives --
 * {@code blacklist:<jti>} for killing a single still-valid access token (logout)
 * and {@code revoked-user:<userId>} for killing every access token a user holds
 * (offboarding / compromise), both checked by {@link JwtAuthFilter}.
 *
 * <p>Adapted from Kenoma's vassago service, with one addition: Kenoma keys
 * everything by refresh-token hash alone and can only revoke all-or-nothing for
 * a user, with no way to list or target one device. Here {@code session:<id>}
 * records plus the {@code user-sessions:<userId>} index add that per-session
 * listing/eviction, which issue #43 explicitly asks for.
 */
@Service
public class SessionService {

    private static final String SESSION_PREFIX = "session:";
    private static final String REFRESH_PREFIX = "refresh:";
    private static final String ROTATED_PREFIX = "refresh-rotated:";
    private static final String USER_SESSIONS_PREFIX = "user-sessions:";
    private static final String REVOKED_USER_PREFIX = "revoked-user:";
    private static final String BLACKLIST_PREFIX = "blacklist:";
    private static final Duration ROTATION_TOMBSTONE_TTL = Duration.ofSeconds(60);
    private static final int TOKEN_BYTES = 32;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final StringRedisTemplate redis;
    private final Duration refreshTtl;
    private final Duration accessTtl;

    public SessionService(
        StringRedisTemplate redis,
        @Value("${app.refresh-token.ttl-days}") long refreshTtlDays,
        @Value("${app.jwt.expiration-minutes}") long accessTtlMinutes
    ) {
        this.redis = redis;
        this.refreshTtl = Duration.ofDays(refreshTtlDays);
        this.accessTtl = Duration.ofMinutes(accessTtlMinutes);
    }

    public record NewSession(UUID sessionId, String rawRefreshToken) {}

    public record SessionInfo(UUID sessionId, String device, Instant createdAt, Instant lastUsedAt) {}

    /** The identity to mint a new access token for, plus the rotated refresh token to hand back as the new cookie. */
    public record Rotated(
        UUID userId,
        String username,
        String role,
        UUID organizationId,
        UUID storefrontId,
        String rawRefreshToken
    ) {}

    public NewSession createSession(
        UUID userId,
        String role,
        UUID organizationId,
        UUID storefrontId,
        String username,
        String userAgent
    ) {
        UUID sessionId = UUID.randomUUID();
        String raw = generateToken();
        String hash = hash(raw);
        String now = Instant.now().toString();

        Map<String, String> fields = new HashMap<>();
        fields.put("userId", userId.toString());
        fields.put("role", role);
        fields.put("username", username);
        if (organizationId != null) {
            fields.put("organizationId", organizationId.toString());
        }
        if (storefrontId != null) {
            fields.put("storefrontId", storefrontId.toString());
        }
        fields.put("refreshTokenHash", hash);
        fields.put("device", deviceLabel(userAgent));
        fields.put("createdAt", now);
        fields.put("lastUsedAt", now);

        String sessionKey = SESSION_PREFIX + sessionId;
        redis.opsForHash().putAll(sessionKey, fields);
        redis.expire(sessionKey, refreshTtl);
        redis.opsForValue().set(REFRESH_PREFIX + hash, sessionId.toString(), refreshTtl);
        String userSessionsKey = USER_SESSIONS_PREFIX + userId;
        redis.opsForSet().add(userSessionsKey, sessionId.toString());
        redis.expire(userSessionsKey, refreshTtl);

        return new NewSession(sessionId, raw);
    }

    /**
     * Consumes {@code rawToken} and rotates it. Empty when the token is unknown/expired
     * (caller should require a fresh login), or when it turns out to be an
     * already-rotated-out token being replayed -- in which case every session for
     * that user has just been revoked as a theft signal.
     */
    public Optional<Rotated> rotate(String rawToken) {
        String hash = hash(rawToken);
        String sessionId = redis.opsForValue().getAndDelete(REFRESH_PREFIX + hash);

        if (sessionId == null) {
            String userId = redis.opsForValue().get(ROTATED_PREFIX + hash);
            if (userId != null) {
                revokeAllForUser(UUID.fromString(userId));
            }
            return Optional.empty();
        }

        String sessionKey = SESSION_PREFIX + sessionId;
        Map<Object, Object> fields = redis.opsForHash().entries(sessionKey);
        if (fields.isEmpty()) {
            return Optional.empty();
        }

        UUID userId = UUID.fromString((String) fields.get("userId"));
        String role = (String) fields.get("role");
        String username = (String) fields.get("username");
        UUID organizationId = fields.get("organizationId") != null ? UUID.fromString((String) fields.get("organizationId")) : null;
        UUID storefrontId = fields.get("storefrontId") != null ? UUID.fromString((String) fields.get("storefrontId")) : null;

        String newRaw = generateToken();
        String newHash = hash(newRaw);

        redis.opsForHash().put(sessionKey, "refreshTokenHash", newHash);
        redis.opsForHash().put(sessionKey, "lastUsedAt", Instant.now().toString());
        redis.expire(sessionKey, refreshTtl);
        redis.opsForValue().set(REFRESH_PREFIX + newHash, sessionId, refreshTtl);
        redis.opsForValue().set(ROTATED_PREFIX + hash, userId.toString(), ROTATION_TOMBSTONE_TTL);
        redis.expire(USER_SESSIONS_PREFIX + userId, refreshTtl);

        return Optional.of(new Rotated(userId, username, role, organizationId, storefrontId, newRaw));
    }

    /**
     * Updates the active storefront stored on the session tied to {@code rawToken}, so a
     * later {@link #rotate} picks up the switch instead of reverting to whatever storefront
     * was active at login. No-op if the token doesn't match a live session.
     */
    public void updateStorefront(String rawToken, UUID storefrontId) {
        String sessionId = redis.opsForValue().get(REFRESH_PREFIX + hash(rawToken));
        if (sessionId == null) {
            return;
        }
        String sessionKey = SESSION_PREFIX + sessionId;
        if (!Boolean.TRUE.equals(redis.hasKey(sessionKey))) {
            return;
        }
        redis.opsForHash().put(sessionKey, "storefrontId", storefrontId.toString());
    }

    /** Ends the session tied to {@code rawToken}. No-op if it's already gone. */
    public void logout(String rawToken) {
        String hash = hash(rawToken);
        String sessionId = redis.opsForValue().getAndDelete(REFRESH_PREFIX + hash);
        if (sessionId == null) {
            return;
        }
        String sessionKey = SESSION_PREFIX + sessionId;
        Object userId = redis.opsForHash().get(sessionKey, "userId");
        redis.delete(sessionKey);
        if (userId != null) {
            redis.opsForSet().remove(USER_SESSIONS_PREFIX + userId, sessionId);
        }
    }

    /** Revokes one of {@code userId}'s own sessions. False if it doesn't exist or isn't theirs. */
    public boolean revokeSession(UUID userId, UUID sessionId) {
        String sessionKey = SESSION_PREFIX + sessionId;
        Object owner = redis.opsForHash().get(sessionKey, "userId");
        if (owner == null || !owner.equals(userId.toString())) {
            return false;
        }
        Object refreshHash = redis.opsForHash().get(sessionKey, "refreshTokenHash");
        if (refreshHash != null) {
            redis.delete(REFRESH_PREFIX + refreshHash);
        }
        redis.delete(sessionKey);
        redis.opsForSet().remove(USER_SESSIONS_PREFIX + userId, sessionId.toString());
        return true;
    }

    /**
     * Kills every session for {@code userId} and sets the revocation cutoff so
     * access tokens already issued (self-service "log out everywhere", offboarding,
     * compromise, or a detected refresh-token replay) stop working immediately
     * instead of waiting out their own expiry.
     */
    public void revokeAllForUser(UUID userId) {
        String setKey = USER_SESSIONS_PREFIX + userId;
        Set<String> sessionIds = redis.opsForSet().members(setKey);
        if (sessionIds != null) {
            for (String sessionId : sessionIds) {
                String sessionKey = SESSION_PREFIX + sessionId;
                Object refreshHash = redis.opsForHash().get(sessionKey, "refreshTokenHash");
                if (refreshHash != null) {
                    redis.delete(REFRESH_PREFIX + refreshHash);
                }
                redis.delete(sessionKey);
            }
        }
        redis.delete(setKey);
        redis.opsForValue().set(REVOKED_USER_PREFIX + userId, String.valueOf(Instant.now().toEpochMilli()), accessTtl);
    }

    /** True if {@code userId}'s tokens issued before their current revocation cutoff should be rejected. */
    public boolean isRevoked(UUID userId, Instant issuedAt) {
        String cutoff = redis.opsForValue().get(REVOKED_USER_PREFIX + userId);
        return cutoff != null && issuedAt.toEpochMilli() < Long.parseLong(cutoff);
    }

    /** Blacklists a single access token (by its {@code jti}) for the rest of its natural life. Used on logout. */
    public void blacklist(String jti, Instant expiresAt) {
        long seconds = Math.max(1, Duration.between(Instant.now(), expiresAt).getSeconds());
        redis.opsForValue().set(BLACKLIST_PREFIX + jti, "1", Duration.ofSeconds(seconds));
    }

    public boolean isBlacklisted(String jti) {
        return Boolean.TRUE.equals(redis.hasKey(BLACKLIST_PREFIX + jti));
    }

    /** Lists {@code userId}'s active sessions, pruning any index entries whose session already expired. */
    public List<SessionInfo> listSessions(UUID userId) {
        String setKey = USER_SESSIONS_PREFIX + userId;
        Set<String> ids = redis.opsForSet().members(setKey);
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }

        List<SessionInfo> sessions = new ArrayList<>();
        for (String id : ids) {
            Map<Object, Object> fields = redis.opsForHash().entries(SESSION_PREFIX + id);
            if (fields.isEmpty()) {
                redis.opsForSet().remove(setKey, id);
                continue;
            }
            sessions.add(new SessionInfo(
                UUID.fromString(id),
                (String) fields.getOrDefault("device", "Dispositivo desconocido"),
                Instant.parse((String) fields.get("createdAt")),
                Instant.parse((String) fields.get("lastUsedAt"))
            ));
        }
        return sessions;
    }

    private static String generateToken() {
        byte[] buffer = new byte[TOKEN_BYTES];
        RANDOM.nextBytes(buffer);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(buffer);
    }

    private static String hash(String raw) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    /**
     * Turns a User-Agent string into a short human label (e.g. "Chrome en Windows")
     * instead of storing the raw header or any network-identifying data -- device +
     * last-used time is enough for someone to recognize their own sessions.
     */
    private static String deviceLabel(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) {
            return "Dispositivo desconocido";
        }
        return browserFrom(userAgent) + " en " + osFrom(userAgent);
    }

    private static String browserFrom(String ua) {
        if (ua.contains("Edg/")) return "Edge";
        if (ua.contains("OPR/") || ua.contains("Opera")) return "Opera";
        if (ua.contains("Firefox/")) return "Firefox";
        if (ua.contains("CriOS/") || ua.contains("Chrome/")) return "Chrome";
        if (ua.contains("Safari/")) return "Safari";
        return "navegador desconocido";
    }

    private static String osFrom(String ua) {
        if (ua.contains("Windows")) return "Windows";
        if (ua.contains("Mac OS X") || ua.contains("Macintosh")) return "macOS";
        if (ua.contains("Android")) return "Android";
        if (ua.contains("iPhone") || ua.contains("iPad") || ua.contains("iOS")) return "iOS";
        if (ua.contains("Linux")) return "Linux";
        return "dispositivo desconocido";
    }
}
