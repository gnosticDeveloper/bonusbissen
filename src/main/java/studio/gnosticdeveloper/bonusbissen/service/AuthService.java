package studio.gnosticdeveloper.bonusbissen.service;

import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import studio.gnosticdeveloper.bonusbissen.dto.request.DashboardLoginRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.LoginRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.UserLoginRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.UserRegisterRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.LoginResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.StorefrontSummary;
import studio.gnosticdeveloper.bonusbissen.entity.Employee;
import studio.gnosticdeveloper.bonusbissen.entity.Storefront;
import studio.gnosticdeveloper.bonusbissen.entity.User;
import studio.gnosticdeveloper.bonusbissen.exception.ConflictException;
import studio.gnosticdeveloper.bonusbissen.exception.NotFoundException;
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

    @Transactional
    public LoginResponse login(LoginRequest request) {
        Employee employee = employeeRepository
            .findByUsername(request.username().toLowerCase())
            .filter(Employee::isActive)
            .orElseThrow(() -> new BadCredentialsException("Invalid username or password"));

        if (!passwordEncoder.matches(request.password(), employee.getPasswordHash())) {
            throw new BadCredentialsException("Invalid username or password");
        }

        return issueEmployeeToken(employee);
    }

    /** Same as {@link #login}, plus a check that the employee belongs to the given org. */
    @Transactional
    public LoginResponse dashboardLogin(DashboardLoginRequest request) {
        Employee employee = employeeRepository
            .findByUsername(request.identifier().trim().toLowerCase(Locale.ROOT))
            .filter(Employee::isActive)
            .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));

        if (!passwordEncoder.matches(request.password(), employee.getPasswordHash())) {
            throw new BadCredentialsException("Invalid credentials");
        }
        if (!employee.getOrganization().getId().equals(request.organizationId())) {
            throw new BadCredentialsException("Invalid credentials");
        }

        return issueEmployeeToken(employee);
    }

    private LoginResponse issueEmployeeToken(Employee employee) {
        List<Storefront> storefronts = employee.getStorefronts().stream().toList();
        List<StorefrontSummary> summaries = storefronts.stream().map(StorefrontSummary::from).toList();
        UUID storefrontId = storefronts.size() == 1 ? storefronts.get(0).getId() : null;

        String token = jwtService.generateToken(employee.getId(), employee.getUsername(), employee.getRole().name(), storefrontId);
        return new LoginResponse(token, summaries);
    }

    @Transactional
    public LoginResponse selectStorefront(UUID employeeId, UUID storefrontId) {
        Employee employee = employeeRepository
            .findById(employeeId)
            .filter(Employee::isActive)
            .orElseThrow(() -> new NotFoundException("No se pudo encontrar un empleado con el ID " + employeeId + "."));

        boolean assigned = employee.getStorefronts().stream().anyMatch(s -> s.getId().equals(storefrontId));
        if (!assigned) {
            throw new AccessDeniedException("No estás asignado a ese local.");
        }

        List<StorefrontSummary> summaries = employee.getStorefronts().stream().map(StorefrontSummary::from).toList();
        String token = jwtService.generateToken(employee.getId(), employee.getUsername(), employee.getRole().name(), storefrontId);
        return new LoginResponse(token, summaries);
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
        return LoginResponse.of(token);
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
        return LoginResponse.of(token);
    }

    private Optional<User> resolveLoginIdentifier(String identifier) {
        if (identifier.contains("@")) {
            return userRepository.findByEmail(identifier).filter(User::isEmailVerified);
        }
        return userRepository.findByUsername(identifier);
    }
}
