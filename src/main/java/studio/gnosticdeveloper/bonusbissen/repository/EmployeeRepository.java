package studio.gnosticdeveloper.bonusbissen.repository;

import studio.gnosticdeveloper.bonusbissen.entity.Employee;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface EmployeeRepository extends JpaRepository<Employee, UUID> {
    Optional<Employee> findByUsername(String username);
    boolean existsByUsername(String username);
}
