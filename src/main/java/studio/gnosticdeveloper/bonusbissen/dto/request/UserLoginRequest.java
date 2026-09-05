package studio.gnosticdeveloper.bonusbissen.dto.request;

import jakarta.validation.constraints.NotBlank;

/**
 * {@code identifier} is the username, or a verified email address.
 */
public record UserLoginRequest(@NotBlank String identifier, @NotBlank String password) {}
