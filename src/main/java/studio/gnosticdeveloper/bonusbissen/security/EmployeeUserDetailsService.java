package studio.gnosticdeveloper.bonusbissen.security;

import studio.gnosticdeveloper.bonusbissen.repository.EmployeeRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class EmployeeUserDetailsService implements UserDetailsService {

    private final EmployeeRepository employeeRepository;

    public EmployeeUserDetailsService(EmployeeRepository employeeRepository) {
        this.employeeRepository = employeeRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) {
        return employeeRepository.findByUsername(username)
                .map(EmployeePrincipal::new)
                .orElseThrow(() -> new UsernameNotFoundException("No employee with username " + username));
    }
}
