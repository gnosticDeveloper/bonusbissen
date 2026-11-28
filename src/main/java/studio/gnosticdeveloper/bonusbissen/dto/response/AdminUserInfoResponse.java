package studio.gnosticdeveloper.bonusbissen.dto.response;

import studio.gnosticdeveloper.bonusbissen.storage.DeliveryVariant;
import studio.gnosticdeveloper.bonusbissen.storage.StorageService;

/** {@code GET /users/me/admin}: the staff member's own identity in the current organization. */
public record AdminUserInfoResponse(
    String username,
    String name,
    String role,
    String email,
    boolean emailVerified,
    /** Null when the user has no profile picture. Same variant as {@link UserResponse#avatarUrl()}. */
    String avatarUrl
) {
    /** Row read by {@code UserRepository#findAdminUserInfo}: the stored picture path, not yet a public URL. */
    public record Row(String username, String name, String role, String email, boolean emailVerified, String profilePicturePath) {}

    public static AdminUserInfoResponse from(Row row, StorageService storage) {
        String path = row.profilePicturePath();
        return new AdminUserInfoResponse(row.username(), row.name(), row.role(), row.email(), row.emailVerified(),
            path == null ? null : storage.resolveUrl(path, DeliveryVariant.THUMBNAIL));
    }
}
