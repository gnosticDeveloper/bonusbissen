package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.util.List;
import java.util.UUID;
import studio.gnosticdeveloper.bonusbissen.entity.PointProgram;

public record PointProgramResponse(
    UUID id,
    String name,
    String unitLabel,
    boolean active,
    List<StorefrontSummary> storefronts
) {
    public static PointProgramResponse from(PointProgram p) {
        return new PointProgramResponse(
            p.getId(),
            p.getName(),
            p.getUnitLabel(),
            p.isActive(),
            p.getStorefronts().stream().map(StorefrontSummary::from).toList()
        );
    }
}
