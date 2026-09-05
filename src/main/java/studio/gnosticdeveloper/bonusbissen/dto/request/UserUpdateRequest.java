package studio.gnosticdeveloper.bonusbissen.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Setting {@code email} to a new value (or clearing it) resets verification;
 * a new verification message is sent when a non-blank address is provided.
 */
public record UserUpdateRequest(@NotBlank String name, @Email @Size(max = 255) String email) {}
