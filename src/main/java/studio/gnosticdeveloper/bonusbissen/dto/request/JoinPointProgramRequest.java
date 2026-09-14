package studio.gnosticdeveloper.bonusbissen.dto.request;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/** Staff joining a user to a point program on the user's behalf. */
public record JoinPointProgramRequest(@NotNull UUID userId) {}
