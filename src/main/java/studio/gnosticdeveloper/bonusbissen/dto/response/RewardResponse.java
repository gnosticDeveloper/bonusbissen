package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

public record RewardResponse(
        UUID id,
        String title,
        String description,
        String imageUrl,
        String imageThumbnailUrl,
        int costPoints,
        BigDecimal discountValue,
        boolean active,
        String createdAtFormatted,
        String imageError
) {}
