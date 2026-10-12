package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.util.UUID;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;

public record OrganizationSummary(UUID id, String name) {
    public static OrganizationSummary from(Organization organization) {
        return new OrganizationSummary(organization.getId(), organization.getName());
    }

    public static OrganizationSummary unknown(UUID id) {
        return new OrganizationSummary(id, null);
    }
}
