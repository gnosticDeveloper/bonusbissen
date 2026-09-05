package studio.gnosticdeveloper.bonusbissen.service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.Locale;
import java.util.Objects;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import studio.gnosticdeveloper.bonusbissen.email.EmailSender;
import studio.gnosticdeveloper.bonusbissen.entity.EmailVerificationToken;
import studio.gnosticdeveloper.bonusbissen.entity.User;
import studio.gnosticdeveloper.bonusbissen.exception.BadRequestException;
import studio.gnosticdeveloper.bonusbissen.repository.EmailVerificationTokenRepository;
import studio.gnosticdeveloper.bonusbissen.repository.UserRepository;

@Service
public class EmailVerificationService {

    private static final int TOKEN_BYTES = 32;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final EmailVerificationTokenRepository tokenRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailSender emailSender;
    private final Duration tokenTtl;
    private final String verificationUrl;

    public EmailVerificationService(
        EmailVerificationTokenRepository tokenRepository,
        UserRepository userRepository,
        PasswordEncoder passwordEncoder,
        EmailSender emailSender,
        @Value("${app.mail.token-ttl-hours:48}") long tokenTtlHours,
        @Value("${app.mail.verification-url:http://localhost:3000/verify-email}") String verificationUrl
    ) {
        this.tokenRepository = tokenRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailSender = emailSender;
        this.tokenTtl = Duration.ofHours(tokenTtlHours);
        this.verificationUrl = verificationUrl;
    }

    /** Lower-cases and trims an address; returns null for null/blank input. */
    public static String normalizeEmail(String email) {
        if (email == null) {
            return null;
        }
        String trimmed = email.trim().toLowerCase(Locale.ROOT);
        return trimmed.isEmpty() ? null : trimmed;
    }

    /**
     * Issue a fresh token for the user's current email and send the message.
     * No-op when the user has no email or it is already verified. Any
     * outstanding tokens for the user are invalidated first.
     */
    @Transactional
    public void sendVerification(User user) {
        if (user.getEmail() == null || user.isEmailVerified()) {
            return;
        }

        tokenRepository
            .findAllByUserIdAndConsumedAtIsNull(user.getId())
            .forEach(t -> t.setConsumedAt(OffsetDateTime.now()));

        EmailVerificationToken token = new EmailVerificationToken();
        token.setUser(user);
        token.setEmail(user.getEmail());
        token.setToken(generateToken());
        token.setExpiresAt(OffsetDateTime.now().plus(tokenTtl));
        tokenRepository.save(token);

        String separator = verificationUrl.contains("?") ? "&" : "?";
        String link = verificationUrl + separator + "token=" + token.getToken();
        emailSender.sendVerificationEmail(user.getEmail(), user.getName(), link);
    }

    @Transactional
    public void verify(String rawToken) {
        EmailVerificationToken token = tokenRepository
            .findByToken(rawToken)
            .orElseThrow(() -> new BadRequestException("El enlace de verificación no es válido."));

        if (token.isConsumed()) {
            throw new BadRequestException("Este enlace de verificación ya fue utilizado.");
        }
        if (token.isExpired()) {
            throw new BadRequestException("El enlace de verificación expiró. Pedí uno nuevo.");
        }

        User user = token.getUser();
        if (!Objects.equals(normalizeEmail(token.getEmail()), normalizeEmail(user.getEmail()))) {
            throw new BadRequestException("El email de la cuenta cambió. Pedí un nuevo enlace de verificación.");
        }

        user.setEmailVerified(true);
        token.setConsumedAt(OffsetDateTime.now());
        userRepository.save(user);
    }

    @Transactional
    public void resend(String identifier, String password) {
        String id = identifier == null ? "" : identifier.trim().toLowerCase(Locale.ROOT);
        User user = (id.contains("@") ? userRepository.findByEmail(id) : userRepository.findByUsername(id))
            .filter(User::isActive)
            .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid credentials");
        }
        if (user.getEmail() == null) {
            throw new BadRequestException("La cuenta no tiene un email asociado.");
        }
        sendVerification(user);
    }

    private String generateToken() {
        byte[] buffer = new byte[TOKEN_BYTES];
        RANDOM.nextBytes(buffer);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(buffer);
    }
}
