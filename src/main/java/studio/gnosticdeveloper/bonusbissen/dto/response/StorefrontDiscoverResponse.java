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
 */
public record StorefrontDiscoverResponse(UUID id, String name, String orgName, String color, String iconUrl, String pointLabel) {}
