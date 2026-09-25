package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.util.List;

/** Mirrors {@code PointsResponse} / {@code Membership} in client/lib/definitions.ts. */
public record PointsSummaryResponse(Summary summary, List<Membership> memberships) {

    public record Summary(long totalPoints) {}

    public record Membership(
        String id,
        Org org,
        long points,
        String pointLabel,
        long totalRedemptions,
        String memberSince
    ) {}

    public record Org(String id, String name, String category, String color, String logoUrl) {}
}
