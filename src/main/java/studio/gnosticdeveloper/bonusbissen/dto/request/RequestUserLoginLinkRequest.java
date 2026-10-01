package studio.gnosticdeveloper.bonusbissen.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record RequestUserLoginLinkRequest(@NotBlank @Email String email) {}
