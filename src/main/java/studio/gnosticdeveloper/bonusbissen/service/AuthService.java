package studio.gnosticdeveloper.bonusbissen.service;

import java.util.Locale;
import java.util.Optional;

import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import studio.gnosticdeveloper.bonusbissen.dto.request.LoginRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.UserLoginRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.UserRegisterRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.LoginResponse;
import studio.gnosticdeveloper.bonusbissen.entity.Employee;
import studio.gnosticdeveloper.bonusbissen.entity.User;
import studio.gnosticdeveloper.bonusbissen.exception.ConflictException;
import studio.gnosticdeveloper.bonusbissen.repository.EmployeeRepository;
import studio.gnosticdeveloper.bonusbissen.repository.UserRepository;
import studio.gnosticdeveloper.bonusbissen.security.JwtService;

@Service
public class AuthService {

    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final EmailVerificationService emailVerificationService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(
        EmployeeRepository employeeRepository,
        UserRepository userRepository,
        EmailVerificationService emailVerificationService,
        PasswordEncoder passwordEncoder,
        JwtService jwtService
    ) {
        this.employeeRepository = employeeRepository;
        this.userRepository = userRepository;
        this.emailVerificationService = emailVerificationService;
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


    @Transactional
    public LoginResponse registerUser(UserRegisterRequest request) {
        String username = request.username().trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByUsername(username)) {
            throw new ConflictException("Ese nombre de usuario ya está en uso.");
        }

        String email = EmailVerificationService.normalizeEmail(request.email());
        if (email != null && userRepository.existsByEmail(email)) {
            throw new ConflictException("Ese email ya está registrado.");
        }

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setName(request.name().trim());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setEmailVerified(false);
        user = userRepository.save(user);

        if (email != null) {
            emailVerificationService.sendVerification(user);
        }

        String token = jwtService.generateToken(user.getId(), user.getUsername(), "USER");
        return new LoginResponse(token);
    }

    public LoginResponse loginUser(UserLoginRequest request) {
        String identifier = request.identifier().trim().toLowerCase(Locale.ROOT);

        User user = resolveLoginIdentifier(identifier)
            .filter(User::isActive)
            .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid credentials");
        }

        String token = jwtService.generateToken(user.getId(), user.getUsername(), "USER");
        return new LoginResponse(token);
    }

    private Optional<User> resolveLoginIdentifier(String identifier) {
        if (identifier.contains("@")) {
            return userRepository.findByEmail(identifier).filter(User::isEmailVerified);
        }
        return userRepository.findByUsername(identifier);
    }
}
