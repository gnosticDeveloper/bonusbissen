package studio.gnosticdeveloper.bonusbissen.security;

import studio.gnosticdeveloper.bonusbissen.entity.Employee;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;

import java.util.List;
import java.util.UUID;

public class EmployeePrincipal extends User {

    private final UUID employeeId;

    public EmployeePrincipal(Employee employee) {
        super(
                employee.getUsername(),
                employee.getPasswordHash(),
                employee.isActive(),
                true,
                true,
                true,
                authorities(employee)
        );
        this.employeeId = employee.getId();
    }

    private static List<GrantedAuthority> authorities(Employee employee) {
        return List.of(new SimpleGrantedAuthority("ROLE_" + employee.getRole().name()));
    }

    public UUID getEmployeeId() {
        return employeeId;
    }
}
