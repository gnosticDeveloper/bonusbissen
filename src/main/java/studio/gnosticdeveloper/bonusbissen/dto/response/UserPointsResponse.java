package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.UUID;
import studio.gnosticdeveloper.bonusbissen.entity.User;

public record UserPointsResponse(
    UUID id,
    String name,
    String username,
    String email,
    boolean emailVerified,
    Integer points,
    String formattedCreatedAt
) {
    private static final ZoneId ZONE_ARGENTINA = ZoneId.of("America/Argentina/Buenos_Aires");
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.of("es", "AR"));

    public static UserPointsResponse from(User user, Integer points) {
        String formattedDate = user.getCreatedAt().atZoneSameInstant(ZONE_ARGENTINA).format(DATE_FORMAT);
        return new UserPointsResponse(
            user.getId(),
            user.getName(),
            user.getUsername(),
            user.getEmail(),
            user.isEmailVerified(),
            points,
            formattedDate
        );
    }
}
