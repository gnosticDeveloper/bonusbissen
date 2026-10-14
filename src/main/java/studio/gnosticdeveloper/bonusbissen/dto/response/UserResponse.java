package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.util.UUID;
import studio.gnosticdeveloper.bonusbissen.entity.User;
import studio.gnosticdeveloper.bonusbissen.storage.DeliveryVariant;
import studio.gnosticdeveloper.bonusbissen.storage.StorageService;

public record UserResponse(UUID id, String name, String username, String email, boolean emailVerified, String avatarUrl) {
    public static UserResponse from(User user, StorageService storage) {
        String path = user.getProfilePicturePath();
        return new UserResponse(user.getId(), user.getName(), user.getUsername(), user.getEmail(), user.isEmailVerified(),
            path == null ? null : storage.resolveUrl(path, DeliveryVariant.THUMBNAIL));
    }
}
