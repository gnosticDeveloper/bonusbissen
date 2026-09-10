package studio.gnosticdeveloper.bonusbissen.repository;

import studio.gnosticdeveloper.bonusbissen.entity.Employee;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface EmployeeRepository extends JpaRepository<Employee, UUID> {
    Optional<Employee> findByUsername(String username);
    boolean existsByUsername(String username);

    /** Employee with the storefronts collection initialised (used off-session, e.g. in the JWT filter). */
    @EntityGraph(attributePaths = "storefronts")
    Optional<Employee> findWithStorefrontsById(UUID id);
}
