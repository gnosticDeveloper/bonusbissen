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
import studio.gnosticdeveloper.bonusbissen.dto.request.UserLoginRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.UserRegisterRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.LoginResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.StorefrontSummary;
import studio.gnosticdeveloper.bonusbissen.entity.OrganizationStaff;
import studio.gnosticdeveloper.bonusbissen.entity.Storefront;
import studio.gnosticdeveloper.bonusbissen.entity.User;
import studio.gnosticdeveloper.bonusbissen.exception.ConflictException;
import studio.gnosticdeveloper.bonusbissen.exception.NotFoundException;
import studio.gnosticdeveloper.bonusbissen.repository.OrganizationStaffRepository;
import studio.gnosticdeveloper.bonusbissen.repository.UserRepository;
import studio.gnosticdeveloper.bonusbissen.security.JwtService;

@Service
public class AuthService {

    private final OrganizationStaffRepository organizationStaffRepository;
    private final UserRepository userRepository;
    private final EmailVerificationService emailVerificationService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(
        OrganizationStaffRepository organizationStaffRepository,
        UserRepository userRepository,
        EmailVerificationService emailVerificationService,
        PasswordEncoder passwordEncoder,
        JwtService jwtService
    ) {
        this.organizationStaffRepository = organizationStaffRepository;
        this.userRepository = userRepository;
        this.emailVerificationService = emailVerificationService;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    /** A staff sign-in, guarded by the organization the dashboard is for. */
    @Transactional
    public LoginResponse dashboardLogin(DashboardLoginRequest request) {
        User user = userRepository
            .findByUsername(request.identifier().trim().toLowerCase(Locale.ROOT))
            .filter(User::isActive)
            .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid credentials");
        }

        OrganizationStaff staff = organizationStaffRepository
            .findByUserIdAndActiveTrue(user.getId())
            .filter(s -> s.getOrganization().getId().equals(request.organizationId()))
            .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));

        return issueStaffToken(user, staff);
    }

    private LoginResponse issueStaffToken(User user, OrganizationStaff staff) {
        List<Storefront> storefronts = staff.getStorefronts().stream().toList();
        List<StorefrontSummary> summaries = storefronts.stream().map(StorefrontSummary::from).toList();
        UUID storefrontId = storefronts.size() == 1 ? storefronts.get(0).getId() : null;

        String token = jwtService.generateToken(user.getId(), user.getUsername(), staff.getRole().name(), storefrontId);
        return new LoginResponse(token, summaries);
    }

    @Transactional
    public LoginResponse selectStorefront(UUID userId, UUID storefrontId) {
        User user = userRepository
            .findById(userId)
            .filter(User::isActive)
            .orElseThrow(() -> new NotFoundException("No se pudo encontrar un usuario con el ID " + userId + "."));

        OrganizationStaff staff = organizationStaffRepository
            .findByUserIdAndActiveTrue(userId)
            .orElseThrow(() -> new NotFoundException("No se pudo encontrar un empleado con el ID " + userId + "."));

        boolean assigned = staff.getStorefronts().stream().anyMatch(s -> s.getId().equals(storefrontId));
        if (!assigned) {
            throw new AccessDeniedException("No estás asignado a ese local.");
        }

        List<StorefrontSummary> summaries = staff.getStorefronts().stream().map(StorefrontSummary::from).toList();
        String token = jwtService.generateToken(user.getId(), user.getUsername(), staff.getRole().name(), storefrontId);
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
