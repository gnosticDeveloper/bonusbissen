package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.util.UUID;

/**
 * Dashboard home figures of one point program -- the one the staff member's selected storefront
 * runs -- for the last {@code periodDays} days; each {@code previous*} value is the same figure
 * for the {@code periodDays} days before that. {@code pendingExchanges} is the program's open
 * queue right now, at any age. {@code programId} and {@code programName} are null, and every
 * figure 0, when the selected storefront has no program.
 */
public record HomeStatsResponse(
    UUID programId,
    String programName,
    int periodDays,
    long exchanges,
    long previousExchanges,
    long activeCustomers,
    long previousActiveCustomers,
    long pointsGranted,
    long previousPointsGranted,
    long pendingExchanges
) {
    public static HomeStatsResponse withoutProgram(int periodDays) {
        return new HomeStatsResponse(null, null, periodDays, 0, 0, 0, 0, 0, 0, 0);
    }
}
