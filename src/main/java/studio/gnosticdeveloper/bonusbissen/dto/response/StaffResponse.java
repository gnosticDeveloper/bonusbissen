package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import studio.gnosticdeveloper.bonusbissen.entity.OrganizationStaff;
import studio.gnosticdeveloper.bonusbissen.entity.StaffRole;

public record StaffResponse(
    UUID id,
    UUID userId,
    String username,
    String name,
    StaffRole role,
    boolean active,
    List<StorefrontSummary> storefronts,
    OffsetDateTime createdAt
) {
    public static StaffResponse from(OrganizationStaff staff) {
        return new StaffResponse(
            staff.getId(),
            staff.getUser().getId(),
            staff.getUser().getUsername(),
            staff.getUser().getName(),
            staff.getRole(),
            staff.isActive(),
            staff.getStorefronts().stream().map(StorefrontSummary::from).toList(),
            staff.getCreatedAt()
        );
    }
}
