package studio.gnosticdeveloper.bonusbissen.merchant;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.UUID;

public record IntegrationCreateRequest(
    @NotBlank @Size(max = 100) String name,
    @NotNull UUID storefrontId,
    @NotNull @DecimalMin(value = "0.0001", message = "pointsPerUnit must be positive") BigDecimal pointsPerUnit,
    @NotBlank @Pattern(regexp = "^[A-Za-z]{3}$", message = "currency must be a 3-letter code") String currency
) {}
