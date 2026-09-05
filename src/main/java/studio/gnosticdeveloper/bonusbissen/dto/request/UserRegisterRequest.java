package studio.gnosticdeveloper.bonusbissen.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Self-service sign-up. Username + password are required; email is optional and,
 * when given, triggers a verification message. bcrypt only hashes the first 72
 * bytes, so the password is capped there.
 */
public record UserRegisterRequest(
    @NotBlank @Size(min = 3, max = 100) @Pattern(regexp = "^[a-zA-Z0-9._-]+$", message = "solo puede contener letras, números y . _ -") String username,
    @NotBlank
    @Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{12,72}$",
        message = "debe tener entre 12 y 72 caracteres e incluir, al menos, una mayúscula, una minúscula, un número y un caracter especial"
    )
    String password,
    @NotBlank @Size(max = 255) String name,
    @Email @Size(max = 255) String email
) {}
