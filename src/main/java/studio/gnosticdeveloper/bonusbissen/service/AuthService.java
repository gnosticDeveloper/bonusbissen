package studio.gnosticdeveloper.bonusbissen.service;

import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import studio.gnosticdeveloper.bonusbissen.dto.request.LoginRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.LoginResponse;
import studio.gnosticdeveloper.bonusbissen.entity.Employee;
import studio.gnosticdeveloper.bonusbissen.repository.EmployeeRepository;
import studio.gnosticdeveloper.bonusbissen.security.JwtService;

@Service
public class AuthService {

    private final EmployeeRepository employeeRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(
        EmployeeRepository employeeRepository,
        PasswordEncoder passwordEncoder,
        JwtService jwtService
    ) {
        this.employeeRepository = employeeRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public LoginResponse login(LoginRequest request) {
        Employee employee = employeeRepository
            .findByUsername(request.username())
            .filter(Employee::isActive)
            .orElseThrow(() -> new BadCredentialsException("Invalid username or password"));

        if (!passwordEncoder.matches(request.password(), employee.getPasswordHash())) {
            throw new BadCredentialsException("Invalid username or password");
        }

        String token = jwtService.generateToken(employee.getId(), employee.getUsername(), employee.getRole().name());
        return new LoginResponse(token);
    }
}
