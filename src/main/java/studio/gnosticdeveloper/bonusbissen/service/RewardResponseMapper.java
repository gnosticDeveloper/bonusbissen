package studio.gnosticdeveloper.bonusbissen.service;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import org.springframework.stereotype.Component;
import studio.gnosticdeveloper.bonusbissen.dto.response.RewardResponse;
import studio.gnosticdeveloper.bonusbissen.entity.Reward;
import studio.gnosticdeveloper.bonusbissen.storage.DeliveryVariant;
import studio.gnosticdeveloper.bonusbissen.storage.StorageService;

@Component
public class RewardResponseMapper {

    private static final ZoneId ZONE_ARGENTINA = ZoneId.of("America/Argentina/Buenos_Aires");
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.of("es", "AR"));

    private final StorageService storageService;

    public RewardResponseMapper(StorageService storageService) {
        this.storageService = storageService;
    }

    public RewardResponse toResponse(Reward reward) {
        String imagePath = reward.getImagePath();
        String imageUrl = imagePath == null ? null : storageService.resolveUrl(imagePath, DeliveryVariant.CARD);
        String imageThumbnailUrl = imagePath == null ? null : storageService.resolveUrl(imagePath, DeliveryVariant.THUMBNAIL);

        return new RewardResponse(
            reward.getId(),
            reward.getTitle(),
            reward.getDescription(),
            imageUrl,
            imageThumbnailUrl,
            reward.getCostPoints(),
            reward.getDiscountValue(),
            reward.isActive(),
            reward.getCreatedAt().atZoneSameInstant(ZONE_ARGENTINA).format(DATE_FORMAT),
            reward.getImageUploadError()
        );
    }
}
