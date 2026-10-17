package studio.gnosticdeveloper.bonusbissen.dto.response;

import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.storage.DeliveryVariant;
import studio.gnosticdeveloper.bonusbissen.storage.StorageService;

public record OrganizationResponse(String name, String logoUrl, String bannerUrl) {
    public static OrganizationResponse from(Organization organization, StorageService storage) {
        return new OrganizationResponse(organization.getName(),
            organization.getLogoPath() == null ? null : storage.resolveUrl(organization.getLogoPath(), DeliveryVariant.THUMBNAIL),
            organization.getBannerPath() == null ? null : storage.resolveUrl(organization.getBannerPath(), DeliveryVariant.CARD));
    }
}
