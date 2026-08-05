package studio.gnosticdeveloper.bonusbissen.service;

import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import studio.gnosticdeveloper.bonusbissen.dto.request.CustomerLoginRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.LoginRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.LoginResponse;
import studio.gnosticdeveloper.bonusbissen.entity.Customer;
import studio.gnosticdeveloper.bonusbissen.entity.Employee;
import studio.gnosticdeveloper.bonusbissen.repository.CustomerRepository;
import studio.gnosticdeveloper.bonusbissen.repository.EmployeeRepository;
import studio.gnosticdeveloper.bonusbissen.security.JwtService;

@Service
public class AuthService {

    private final EmployeeRepository employeeRepository;
    private final CustomerRepository customerRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(
        EmployeeRepository employeeRepository,
        CustomerRepository customerRepository,
        PasswordEncoder passwordEncoder,
        JwtService jwtService
    ) {
        this.employeeRepository = employeeRepository;
        this.customerRepository = customerRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public LoginResponse login(LoginRequest request) {
        Employee employee = employeeRepository
            .findByUsername(request.username().toLowerCase())
            .filter(Employee::isActive)
            .orElseThrow(() -> new BadCredentialsException("Invalid username or password"));

        if (!passwordEncoder.matches(request.password(), employee.getPasswordHash())) {
            throw new BadCredentialsException("Invalid username or password");
        }

        String token = jwtService.generateToken(employee.getId(), employee.getUsername(), employee.getRole().name());
        return new LoginResponse(token);
    }

    public LoginResponse loginCustomer(CustomerLoginRequest request) {
        Customer customer = customerRepository.findByPhone(request.phone())
                .filter(Customer::isActive)
                .orElseThrow(() -> new BadCredentialsException("Invalid phone number"));

        String token = jwtService.generateToken(customer.getId(), customer.getName(), "CUSTOMER");
        return new LoginResponse(token);
    }
}
