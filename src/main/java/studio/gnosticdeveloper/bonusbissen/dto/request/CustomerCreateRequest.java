package studio.gnosticdeveloper.bonusbissen.dto.request;

import jakarta.validation.constraints.NotBlank;

public record CustomerCreateRequest(
        @NotBlank String document,
        @NotBlank String name,
        String phone
) {
}
