package studio.gnosticdeveloper.bonusbissen.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import org.springframework.web.multipart.MultipartFile;

public record RewardUpdateRequest(
    @NotBlank String name,
    String description,
    MultipartFile image,
    @NotNull @Positive Integer costPoints,
    BigDecimal discountValue,
    Boolean active
) {}
