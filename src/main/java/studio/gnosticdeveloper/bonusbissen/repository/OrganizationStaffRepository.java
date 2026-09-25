package studio.gnosticdeveloper.bonusbissen.repository;

import studio.gnosticdeveloper.bonusbissen.entity.OrganizationStaff;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrganizationStaffRepository extends JpaRepository<OrganizationStaff, UUID> {
    Optional<OrganizationStaff> findByUserIdAndActiveTrue(UUID userId);

    /** Active staff row with storefronts/user/organization initialised (used off-session, e.g. in the JWT filter). */
    @EntityGraph(attributePaths = { "storefronts", "user", "organization" })
    Optional<OrganizationStaff> findWithStorefrontsByUserIdAndActiveTrue(UUID userId);

    @EntityGraph(attributePaths = { "storefronts", "user" })
    List<OrganizationStaff> findByOrganizationIdOrderByCreatedAt(UUID organizationId);

    @EntityGraph(attributePaths = { "storefronts", "user", "organization" })
    Optional<OrganizationStaff> findByIdAndOrganizationId(UUID id, UUID organizationId);
}
