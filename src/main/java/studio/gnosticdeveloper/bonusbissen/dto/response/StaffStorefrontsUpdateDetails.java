package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.util.List;

/** {@code action} is "attach" or "detach". */
public record StaffStorefrontsUpdateDetails(String action, List<StorefrontSummary> storefronts) implements TraceabilityDetails {}
