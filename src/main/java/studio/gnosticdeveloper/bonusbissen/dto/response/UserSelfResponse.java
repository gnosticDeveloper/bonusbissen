package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.util.List;
import java.util.UUID;
import studio.gnosticdeveloper.bonusbissen.entity.User;
import studio.gnosticdeveloper.bonusbissen.storage.DeliveryVariant;
import studio.gnosticdeveloper.bonusbissen.storage.StorageService;

/** {@code GET /users/me}: the user's own profile plus the storefronts they've joined. */
public record UserSelfResponse(
    UUID id,
    String name,
    String username,
    String email,
    boolean emailVerified,
    List<UUID> storefrontIds,
    String avatarUrl
) {
    public static UserSelfResponse from(User user, List<UUID> storefrontIds, StorageService storage) {
        return new UserSelfResponse(
            user.getId(),
            user.getName(),
            user.getUsername(),
            user.getEmail(),
            user.isEmailVerified(),
            storefrontIds,
            user.getProfilePicturePath() == null ? null : storage.resolveUrl(user.getProfilePicturePath(), DeliveryVariant.THUMBNAIL)
        );
    }
}
