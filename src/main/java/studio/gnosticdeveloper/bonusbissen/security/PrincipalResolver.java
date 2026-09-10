package studio.gnosticdeveloper.bonusbissen.security;

import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;

import studio.gnosticdeveloper.bonusbissen.entity.User;
import studio.gnosticdeveloper.bonusbissen.entity.Employee;
import studio.gnosticdeveloper.bonusbissen.repository.UserRepository;
import studio.gnosticdeveloper.bonusbissen.repository.EmployeeRepository;

@Service
public class PrincipalResolver {

    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;

    public PrincipalResolver(EmployeeRepository employeeRepository, UserRepository userRepository) {
        this.employeeRepository = employeeRepository;
        this.userRepository = userRepository;
    }

    public Optional<AuthenticatedPrincipal> resolve(UUID id, String role, UUID storefrontId) {
        return switch (role) {
            case "ADMIN", "CASHIER" -> employeeRepository.findWithStorefrontsById(id)
                    .filter(Employee::isActive)
                    .map(e -> new AuthenticatedPrincipal(
                        e.getId(),
                        e.getUsername(),
                        e.getRole().name(),
                        e.getOrganization().getId(),
                        storefrontId != null && e.getStorefronts().stream().anyMatch(s -> s.getId().equals(storefrontId))
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
