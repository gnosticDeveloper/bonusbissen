package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.util.List;
import java.util.UUID;
import studio.gnosticdeveloper.bonusbissen.entity.User;

/** {@code GET /users/me}: the user's own profile plus the storefronts they've joined. */
public record UserSelfResponse(
    UUID id,
    String name,
    String username,
    String email,
    boolean emailVerified,
    List<UUID> storefrontIds
) {
    public static UserSelfResponse from(User user, List<UUID> storefrontIds) {
        return new UserSelfResponse(
            user.getId(),
            user.getName(),
            user.getUsername(),
            user.getEmail(),
            user.isEmailVerified(),
            storefrontIds
        );
    }
}
