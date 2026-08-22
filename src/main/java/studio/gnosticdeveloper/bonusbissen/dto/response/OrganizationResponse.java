package studio.gnosticdeveloper.bonusbissen.dto.response;

import studio.gnosticdeveloper.bonusbissen.entity.Organization;

public record OrganizationResponse(String name, String iconUrl, String hours, String address, String description) {
    public static OrganizationResponse from(Organization organization) {
        return new OrganizationResponse(
            organization.getName(),
            organization.getIconPath(),
            organization.getHours(),
            organization.getAddress(),
            organization.getDescription()
        );
    }
}
