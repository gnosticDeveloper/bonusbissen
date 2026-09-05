package studio.gnosticdeveloper.bonusbissen.dto.request;

import jakarta.validation.constraints.NotBlank;

/**
 * Re-send the verification message. Credentials are required so an unauthenticated
 * caller can't spray mail at arbitrary accounts. {@code identifier} is the
 * username or the (still unverified) email address.
 */
public record ResendVerificationRequest(@NotBlank String identifier, @NotBlank String password) {}
