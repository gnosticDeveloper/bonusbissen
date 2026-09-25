package studio.gnosticdeveloper.bonusbissen.dto.response;

import studio.gnosticdeveloper.bonusbissen.entity.Organization;

public record OrganizationResponse(String name) {
    public static OrganizationResponse from(Organization organization) {
        return new OrganizationResponse(organization.getName());
    }
}
