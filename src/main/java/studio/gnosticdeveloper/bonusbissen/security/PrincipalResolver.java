package studio.gnosticdeveloper.bonusbissen.security;

import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;

import studio.gnosticdeveloper.bonusbissen.entity.Customer;
import studio.gnosticdeveloper.bonusbissen.entity.Employee;
import studio.gnosticdeveloper.bonusbissen.repository.CustomerRepository;
import studio.gnosticdeveloper.bonusbissen.repository.EmployeeRepository;

@Service
public class PrincipalResolver {

    private final EmployeeRepository employeeRepository;
    private final CustomerRepository customerRepository;

    public PrincipalResolver(EmployeeRepository employeeRepository, CustomerRepository customerRepository) {
        this.employeeRepository = employeeRepository;
        this.customerRepository = customerRepository;
    }

    public Optional<AuthenticatedPrincipal> resolve(UUID id, String role) {
        return switch (role) {
            case "ADMIN", "CASHIER" -> employeeRepository.findById(id)
                    .filter(Employee::isActive)
                    .map(e -> new AuthenticatedPrincipal(e.getId(), e.getUsername(), e.getRole().name()));

            case "CUSTOMER" -> customerRepository.findById(id)
                    .filter(Customer::isActive)
                    .map(c -> new AuthenticatedPrincipal(c.getId(), c.getName(), "CUSTOMER"));

            default -> Optional.empty();
        };
    }
}
