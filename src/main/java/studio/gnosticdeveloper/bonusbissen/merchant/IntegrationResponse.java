package studio.gnosticdeveloper.bonusbissen.merchant;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/** {@code secret} is non-null only in the response to creation -- it can't be read back afterwards. */
public record IntegrationResponse(
    UUID id,
    String name,
    String provider,
    UUID storefrontId,
    String keyId,
    BigDecimal pointsPerUnit,
    String currency,
    boolean active,
    OffsetDateTime createdAt,
    String secret
) {
    public static IntegrationResponse from(MerchantIntegration i, String secret) {
        return new IntegrationResponse(
            i.getId(), i.getName(), i.getProvider(), i.getStorefront().getId(), i.getKeyId(),
            i.getPointsPerUnit(), i.getCurrency(), i.isActive(), i.getCreatedAt(), secret
        );
    }
}
