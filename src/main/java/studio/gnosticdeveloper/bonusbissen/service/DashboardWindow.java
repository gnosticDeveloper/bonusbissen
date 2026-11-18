package studio.gnosticdeveloper.bonusbissen.service;

import java.time.OffsetDateTime;

/**
 * The fixed window the dashboard home ("Inicio") reports on: a rolling last {@value #DAYS} days,
 * compared against the {@value #DAYS} days before it. There's no period selector yet, so this is
 * the single place the length is defined.
 */
public final class DashboardWindow {

    public static final int DAYS = 30;

    private DashboardWindow() {}

    /** Start of the current window ending at {@code now}. */
    public static OffsetDateTime start(OffsetDateTime now) {
        return now.minusDays(DAYS);
    }

    /** Start of the window right before the current one. */
    public static OffsetDateTime previousStart(OffsetDateTime now) {
        return now.minusDays(2L * DAYS);
    }
}
