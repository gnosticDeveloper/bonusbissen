package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.util.UUID;

/**
 * Minimal representation of a storefront's information
 * @param id
 * @param name
 * @param orgName
 * @param color
 * @param iconUrl
 * @param pointLabel
 * @param orgLogoUrl resolved organization logo URL, or null when unset
 * @param orgBannerUrl resolved organization banner URL, or null when unset
 */
public record StorefrontDiscoverResponse(
    UUID id, String name, String orgName, String color, String iconUrl, String pointLabel,
    String orgLogoUrl, String orgBannerUrl
) {}
