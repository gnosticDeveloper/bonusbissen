package studio.gnosticdeveloper.bonusbissen.security;

import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;

import studio.gnosticdeveloper.bonusbissen.entity.User;
import studio.gnosticdeveloper.bonusbissen.repository.UserRepository;
import studio.gnosticdeveloper.bonusbissen.repository.OrganizationStaffRepository;

@Service
public class PrincipalResolver {

    private final OrganizationStaffRepository organizationStaffRepository;
    private final UserRepository userRepository;

    public PrincipalResolver(OrganizationStaffRepository organizationStaffRepository, UserRepository userRepository) {
        this.organizationStaffRepository = organizationStaffRepository;
        this.userRepository = userRepository;
    }

    public Optional<AuthenticatedPrincipal> resolve(UUID id, String role, UUID storefrontId) {
        return switch (role) {
            case "ADMIN", "CASHIER" -> organizationStaffRepository.findWithStorefrontsByUserIdAndActiveTrue(id)
                    .filter(staff -> staff.getUser().isActive())
                    .map(staff -> new AuthenticatedPrincipal(
                        staff.getUser().getId(),
                        staff.getUser().getUsername(),
                        staff.getRole().name(),
                        staff.getOrganization().getId(),
                        storefrontId != null && staff.getStorefronts().stream().anyMatch(s -> s.getId().equals(storefrontId))
                            ? storefrontId
                            : null
                    ));

            case "USER" -> userRepository.findById(id)
                    .filter(User::isActive)
                    .map(c -> new AuthenticatedPrincipal(c.getId(), c.getName(), "USER", null, null));

            default -> Optional.empty();
        };
    }
}
