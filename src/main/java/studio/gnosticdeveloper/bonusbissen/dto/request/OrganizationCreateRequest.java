package studio.gnosticdeveloper.bonusbissen.dto.request;

import jakarta.validation.constraints.NotBlank;

public record OrganizationCreateRequest(@NotBlank String name) {
}
