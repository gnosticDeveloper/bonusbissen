package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.util.UUID;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;

/** Minimal organization row for the public dashboard sign-in picker. */
public record OrganizationOption(UUID id, String name) {
    public static OrganizationOption from(Organization organization) {
        return new OrganizationOption(organization.getId(), organization.getName());
    }
}
