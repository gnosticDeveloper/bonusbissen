package studio.gnosticdeveloper.bonusbissen.service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import studio.gnosticdeveloper.bonusbissen.email.EmailSender;
import studio.gnosticdeveloper.bonusbissen.entity.LoginLinkToken;
import studio.gnosticdeveloper.bonusbissen.entity.OrganizationStaff;
import studio.gnosticdeveloper.bonusbissen.entity.User;
import studio.gnosticdeveloper.bonusbissen.exception.BadRequestException;
import studio.gnosticdeveloper.bonusbissen.repository.LoginLinkTokenRepository;
import studio.gnosticdeveloper.bonusbissen.repository.OrganizationStaffRepository;
import studio.gnosticdeveloper.bonusbissen.repository.UserRepository;

/**
 * One-time passwordless sign-in links. Mirrors {@link EmailVerificationService}'s
 * token lifecycle (generate, mail, consume once) but for granting a session
 * instead of confirming an address. A link is only ever issued for an account
 * whose email is already verified.
 */
@Service
public class LoginLinkService {

    private static final int TOKEN_BYTES = 32;
    private static final SecureRandom RANDOM = new SecureRandom();

    /** Result of consuming a dashboard-context link: the staff row to issue a token for. */
    public record StaffLoginLink(User user, OrganizationStaff staff) {}

    private final LoginLinkTokenRepository tokenRepository;
    private final UserRepository userRepository;
    private final OrganizationStaffRepository organizationStaffRepository;
    private final EmailSender emailSender;
    private final Duration tokenTtl;
    private final String userLoginLinkUrl;
    private final String dashboardLoginLinkUrl;

    public LoginLinkService(
        LoginLinkTokenRepository tokenRepository,
        UserRepository userRepository,
        OrganizationStaffRepository organizationStaffRepository,
        EmailSender emailSender,
        @Value("${app.mail.login-link-ttl-minutes:15}") long tokenTtlMinutes,
        @Value("${app.mail.login-link-url:http://localhost:3000/login-link}") String userLoginLinkUrl,
        @Value("${app.mail.dashboard-login-link-url:http://localhost:3000/d/login-link}") String dashboardLoginLinkUrl
    ) {
        this.tokenRepository = tokenRepository;
        this.userRepository = userRepository;
        this.organizationStaffRepository = organizationStaffRepository;
        this.emailSender = emailSender;
        this.tokenTtl = Duration.ofMinutes(tokenTtlMinutes);
        this.userLoginLinkUrl = userLoginLinkUrl;
        this.dashboardLoginLinkUrl = dashboardLoginLinkUrl;
    }

    /**
     * Request a customer login link. Silently does nothing when the email is
     * unknown or not verified, so the response never reveals which is the case.
     */
    @Transactional
    public void requestUserLink(String rawEmail) {
        String email = EmailVerificationService.normalizeEmail(rawEmail);
        if (email == null) {
            return;
        }

        userRepository
            .findByEmail(email)
            .filter(User::isActive)
            .filter(User::isEmailVerified)
            .ifPresent(user -> {
                tokenRepository
                    .findAllByUserIdAndOrganizationIdIsNullAndConsumedAtIsNull(user.getId())
                    .forEach(t -> t.setConsumedAt(OffsetDateTime.now()));

                LoginLinkToken token = issueToken(user, null);
                String link = buildLink(userLoginLinkUrl, token.getToken());
                emailSender.sendUserLoginLinkEmail(user.getEmail(), user.getName(), link, tokenTtl.toMinutes());
            });
    }

    /**
     * Request a dashboard staff login link, scoped to {@code organizationId}.
     * Silently does nothing when the identifier is unknown, unverified, or not
     * active staff of that exact organization.
     */
    @Transactional
    public void requestDashboardLink(String identifier, UUID organizationId) {
        String id = identifier == null ? "" : identifier.trim().toLowerCase(Locale.ROOT);

        Optional<User> maybeUser = id.contains("@") ? userRepository.findByEmail(id) : userRepository.findByUsername(id);

        maybeUser
            .filter(User::isActive)
            .filter(User::isEmailVerified)
            .flatMap(user ->
                organizationStaffRepository
                    .findByUserIdAndActiveTrue(user.getId())
                    .filter(staff -> staff.getOrganization().getId().equals(organizationId))
                    .map(_ -> user)
            )
            .ifPresent(user -> {
                tokenRepository
                    .findAllByUserIdAndOrganizationIdAndConsumedAtIsNull(user.getId(), organizationId)
                    .forEach(t -> t.setConsumedAt(OffsetDateTime.now()));

                LoginLinkToken token = issueToken(user, organizationId);
                String link = buildLink(dashboardLoginLinkUrl, token.getToken());
                emailSender.sendDashboardLoginLinkEmail(user.getEmail(), user.getName(), link, tokenTtl.toMinutes());
            });
    }

    /** Consume a customer-context link and return the account to issue a token for. */
    @Transactional
    public User consumeUserLink(String rawToken) {
        LoginLinkToken token = findValidToken(rawToken);
        if (token.getOrganizationId() != null) {
            throw new BadRequestException("Invalid login link", "El enlace de inicio de sesión no es válido.");
        }

        User user = token.getUser();
        if (!user.isActive() || !user.isEmailVerified()) {
            throw new BadRequestException("Invalid login link", "El enlace de inicio de sesión no es válido.");
        }

        token.setConsumedAt(OffsetDateTime.now());
        return user;
    }

    /** Consume a dashboard-context link and return the (user, staff) pair to issue a token for. */
    @Transactional
    public StaffLoginLink consumeDashboardLink(String rawToken) {
        LoginLinkToken token = findValidToken(rawToken);
        if (token.getOrganizationId() == null) {
            throw new BadRequestException("Invalid login link", "El enlace de inicio de sesión no es válido.");
        }

        User user = token.getUser();
        if (!user.isActive() || !user.isEmailVerified()) {
            throw new BadRequestException("Invalid login link", "El enlace de inicio de sesión no es válido.");
        }

        OrganizationStaff staff = organizationStaffRepository
            .findWithStorefrontsByUserIdAndActiveTrue(user.getId())
            .filter(s -> s.getOrganization().getId().equals(token.getOrganizationId()))
            .orElseThrow(() ->
                new BadRequestException("User tried to login an organization he is no longer a member of.", "Ya no formás parte de esa organización.")
            );

        token.setConsumedAt(OffsetDateTime.now());
        return new StaffLoginLink(user, staff);
    }

    private LoginLinkToken findValidToken(String rawToken) {
        LoginLinkToken token = tokenRepository
            .findByToken(rawToken)
            .orElseThrow(() -> new BadRequestException("Invalid login token", "El enlace de inicio de sesión no es válido."));

        if (token.isConsumed()) {
            throw new BadRequestException("The login token has already being used", "Este enlace de inicio de sesión ya fue utilizado.");
        }
        if (token.isExpired()) {
            throw new BadRequestException("Expired login token", "El enlace de inicio de sesión expiró. Pedí uno nuevo.");
        }
        return token;
    }

    private LoginLinkToken issueToken(User user, UUID organizationId) {
        LoginLinkToken token = new LoginLinkToken();
        token.setUser(user);
        token.setOrganizationId(organizationId);
        token.setEmail(user.getEmail());
        token.setToken(generateToken());
        token.setExpiresAt(OffsetDateTime.now().plus(tokenTtl));
        return tokenRepository.save(token);
    }

    private static String buildLink(String baseUrl, String rawToken) {
        String separator = baseUrl.contains("?") ? "&" : "?";
        return baseUrl + separator + "token=" + rawToken;
    }

    private String generateToken() {
        byte[] buffer = new byte[TOKEN_BYTES];
        RANDOM.nextBytes(buffer);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(buffer);
    }
}
