package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

import studio.gnosticdeveloper.bonusbissen.security.SessionService;

public record SessionResponse(
    UUID id,
    String device,
    OffsetDateTime createdAt,
    OffsetDateTime lastUsedAt,
    boolean current
) {
    public static SessionResponse from(SessionService.SessionInfo info, UUID currentSessionId) {
        return new SessionResponse(
            info.sessionId(),
            info.device(),
            OffsetDateTime.ofInstant(info.createdAt(), ZoneOffset.UTC),
            OffsetDateTime.ofInstant(info.lastUsedAt(), ZoneOffset.UTC),
            info.sessionId().equals(currentSessionId)
        );
    }
}
