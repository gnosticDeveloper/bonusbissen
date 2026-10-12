package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.util.UUID;
import studio.gnosticdeveloper.bonusbissen.entity.User;

public record UserSummary(UUID id, String username, String name) {
    public static UserSummary from(User user) {
        return new UserSummary(user.getId(), user.getUsername(), user.getName());
    }

    /** Used when a referenced user id couldn't be resolved (e.g. hard-deleted). */
    public static UserSummary unknown(UUID id) {
        return new UserSummary(id, null, null);
    }
}
