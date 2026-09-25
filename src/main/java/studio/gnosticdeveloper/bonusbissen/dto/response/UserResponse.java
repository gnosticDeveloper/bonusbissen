package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.util.UUID;
import studio.gnosticdeveloper.bonusbissen.entity.User;

public record UserResponse(UUID id, String name, String username, String email, boolean emailVerified) {
    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getName(), user.getUsername(), user.getEmail(), user.isEmailVerified());
    }
}
