package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import studio.gnosticdeveloper.bonusbissen.repository.StorefrontUserRow;

/**
 * A user affiliated with a storefront. {@code balance} is the user's balance in the storefront's whole point
 * program; {@code totalEarned} / {@code totalRedeemed} / {@code lastActivityAt} only count what happened at this
 * storefront ({@code lastActivityAt} is null if the user has no transactions there yet).
 */
public record StorefrontUserResponse(
    UUID id,
    String name,
    String username,
    String email,
    boolean emailVerified,
    OffsetDateTime joinedAt,
    long balance,
    long totalEarned,
    long totalRedeemed,
    OffsetDateTime lastActivityAt
) {
    public static StorefrontUserResponse from(StorefrontUserRow row) {
        return new StorefrontUserResponse(
            row.getId(),
            row.getName(),
            row.getUsername(),
            row.getEmail(),
            row.getEmailVerified(),
            row.getJoinedAt().atOffset(ZoneOffset.UTC),
            row.getBalance(),
            row.getTotalEarned(),
            row.getTotalRedeemed(),
            row.getLastActivityAt() == null ? null : row.getLastActivityAt().atOffset(ZoneOffset.UTC)
        );
    }
}
