package studio.gnosticdeveloper.bonusbissen.repository;

import java.time.Instant;
import java.util.UUID;

/** One row of {@link UserPointProgramRepository#findStorefrontUsers}; aliases in the query must match these getters. */
public interface StorefrontUserRow {
    UUID getId();

    String getName();

    String getUsername();

    String getEmail();

    boolean getEmailVerified();

    Instant getJoinedAt();

    Long getBalance();

    Long getTotalEarned();

    Long getTotalRedeemed();

    Instant getLastActivityAt();
}
