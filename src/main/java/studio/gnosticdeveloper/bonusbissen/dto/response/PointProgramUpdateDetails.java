package studio.gnosticdeveloper.bonusbissen.dto.response;

/** {@code expirationMonths} null means points never expire. */
public record PointProgramUpdateDetails(
    PointProgramSummary program,
    String previousName,
    String name,
    boolean previousActive,
    boolean active,
    Integer previousExpirationMonths,
    Integer expirationMonths
) implements TraceabilityDetails {}
