package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.util.List;
import java.util.UUID;

/** One discover card. {@code points} is 0 without a user token; legacy {@code logoUrl} is the storefront icon, not the organization's logo. */
public record BusinessResponse(
    UUID id,
    String name,
    String orgName,
    String category,
    String description,
    String color,
    String logoUrl,
    String pointLabel,
    int points,
    List<RewardResponse> rewards,
    Address address,
    String orgLogoUrl,
    String orgBannerUrl
) {
    public record Address(String street, String city, String province) {}
}
