package studio.gnosticdeveloper.bonusbissen.controller;

import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import studio.gnosticdeveloper.bonusbissen.dto.request.DashboardLoginRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.LoginLinkConsumeRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.RequestDashboardLoginLinkRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.RequestUserLoginLinkRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.ResendVerificationRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.SelectStorefrontRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.UserLoginRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.UserRegisterRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.VerifyEmailRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.LoginResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.PublicKeyResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.SessionResponse;
import studio.gnosticdeveloper.bonusbissen.entity.User;
import studio.gnosticdeveloper.bonusbissen.exception.BadRequestException;
import studio.gnosticdeveloper.bonusbissen.exception.NotFoundException;
import studio.gnosticdeveloper.bonusbissen.security.AuthenticatedPrincipal;
import studio.gnosticdeveloper.bonusbissen.security.JwtService;
import studio.gnosticdeveloper.bonusbissen.security.SessionService;
import studio.gnosticdeveloper.bonusbissen.service.AuthService;
import studio.gnosticdeveloper.bonusbissen.service.EmailVerificationService;
import studio.gnosticdeveloper.bonusbissen.service.LoginLinkService;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private static final String REFRESH_COOKIE = "bb_rt";
    // A plain cross-site HTML-form CSRF can't set a custom header, so this is a
    // cheap real mitigation for /refresh and /logout -- needed because the bb_rt
    // cookie has to be SameSite=None (cross-origin client/dashboard) which forfeits
    // SameSite's own CSRF protection, and the app otherwise disables CSRF entirely.
    private static final String CSRF_HEADER = "X-Requested-With";
    private static final String CSRF_HEADER_VALUE = "XMLHttpRequest";

    private final AuthService authService;
    private final EmailVerificationService emailVerificationService;
    private final LoginLinkService loginLinkService;
    private final JwtService jwtService;
    private final SessionService sessionService;
    private final Duration refreshTtl;
    private final boolean cookieSecure;

    public AuthController(
        AuthService authService,
        EmailVerificationService emailVerificationService,
        LoginLinkService loginLinkService,
        JwtService jwtService,
        SessionService sessionService,
        @Value("${app.refresh-token.ttl-days}") long refreshTtlDays,
        @Value("${app.cookie.secure}") boolean cookieSecure
    ) {
        this.authService = authService;
        this.emailVerificationService = emailVerificationService;
        this.loginLinkService = loginLinkService;
        this.jwtService = jwtService;
        this.sessionService = sessionService;
        this.refreshTtl = Duration.ofDays(refreshTtlDays);
        this.cookieSecure = cookieSecure;
    }

    /**
     * Public verification key for the JWTs this service issues, so other
     * services/consumers can validate a bearer token without sharing a secret.
     */
    @GetMapping("/public-key")
    public PublicKeyResponse publicKey() {
        return PublicKeyResponse.of(jwtService.publicKeyBase64());
    }

    @PostMapping("/dashboard/sign-in")
    public LoginResponse dashboardSignIn(@Valid @RequestBody DashboardLoginRequest request, HttpServletRequest req, HttpServletResponse res) {
        return respond(authService.dashboardLogin(request, userAgent(req)), res);
    }

    @PostMapping("/user-register")
    @ResponseStatus(HttpStatus.CREATED)
    public LoginResponse userRegister(@Valid @RequestBody UserRegisterRequest request, HttpServletRequest req, HttpServletResponse res) {
        return respond(authService.registerUser(request, userAgent(req)), res);
    }

    @PostMapping("/user-login")
    public LoginResponse userLogin(@Valid @RequestBody UserLoginRequest request, HttpServletRequest req, HttpServletResponse res) {
        return respond(authService.loginUser(request, userAgent(req)), res);
    }

    /**
     * Pick (or switch) the active storefront for an already-authenticated
     * employee. Called after login when the employee has more than one
     * storefront, and by the dashboard storefront switcher. Requires a valid
     * bearer token even though /auth/** is otherwise open.
     */
    @PostMapping("/storefront")
    public LoginResponse selectStorefront(
        @Valid @RequestBody SelectStorefrontRequest request,
        @AuthenticationPrincipal AuthenticatedPrincipal principal,
        HttpServletRequest req
    ) {
        if (principal == null || !List.of("ADMIN", "CASHIER").contains(principal.role())) {
            throw new AccessDeniedException("Necesitás iniciar sesión como empleado.");
        }
        LoginResponse response = authService.selectStorefront(principal.id(), request.storefrontId());
        readCookie(req).ifPresent(raw -> sessionService.updateStorefront(raw, request.storefrontId()));
        return response;
    }

    @PostMapping("/verify-email")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        emailVerificationService.verify(request.token());
    }

    @PostMapping("/resend-verification")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resendVerification(@Valid @RequestBody ResendVerificationRequest request) {
        emailVerificationService.resend(request.identifier(), request.password());
    }

    /** Always 204, whether or not the email is known/verified, so the response can't be used to enumerate accounts. */
    @PostMapping("/user-login-link/request")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void requestUserLoginLink(@Valid @RequestBody RequestUserLoginLinkRequest request) {
        loginLinkService.requestUserLink(request.email());
    }

    @PostMapping("/user-login-link/consume")
    public LoginResponse consumeUserLoginLink(@Valid @RequestBody LoginLinkConsumeRequest request, HttpServletRequest req, HttpServletResponse res) {
        User user = loginLinkService.consumeUserLink(request.token());
        return respond(authService.issueUserToken(user, userAgent(req)), res);
    }

    /** Always 204, whether the identifier/org combination is valid, so the response can't be used to enumerate accounts. */
    @PostMapping("/dashboard/login-link/request")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void requestDashboardLoginLink(@Valid @RequestBody RequestDashboardLoginLinkRequest request) {
        loginLinkService.requestDashboardLink(request.identifier(), request.organizationId());
    }

    @PostMapping("/dashboard/login-link/consume")
    public LoginResponse consumeDashboardLoginLink(@Valid @RequestBody LoginLinkConsumeRequest request, HttpServletRequest req, HttpServletResponse res) {
        LoginLinkService.StaffLoginLink link = loginLinkService.consumeDashboardLink(request.token());
        return respond(authService.issueStaffToken(link.user(), link.staff(), userAgent(req)), res);
    }

    /** Rotates the refresh cookie for a fresh (short-lived) access token, without asking for credentials again. */
    @PostMapping("/refresh")
    public LoginResponse refresh(HttpServletRequest req, HttpServletResponse res) {
        requireCsrfHeader(req);
        String raw = readCookie(req).orElseThrow(() -> new BadCredentialsException("No hay una sesión activa."));

        Optional<SessionService.Rotated> rotated = sessionService.rotate(raw);
        if (rotated.isEmpty()) {
            clearCookie(res);
            throw new BadCredentialsException("La sesión expiró o fue revocada. Iniciá sesión de nuevo.");
        }

        SessionService.Rotated session = rotated.get();
        String token = jwtService.generateToken(session.userId(), session.username(), session.role(), session.storefrontId());
        setCookie(res, session.rawRefreshToken());
        return LoginResponse.of(token);
    }

    /** Ends the current session: drops its refresh token and immediately kills its still-valid access token. */
    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest req, HttpServletResponse res) {
        requireCsrfHeader(req);
        readCookie(req).ifPresent(sessionService::logout);
        blacklistCurrentToken(req);
        clearCookie(res);
    }

    /** Lists the caller's own active sessions/devices. */
    @GetMapping("/sessions")
    public List<SessionResponse> listSessions(
        @AuthenticationPrincipal AuthenticatedPrincipal principal,
        HttpServletRequest req
    ) {
        requireAuthenticated(principal);
        UUID currentSessionId = readCookie(req).flatMap(sessionService::findSessionId).orElse(null);
        return sessionService.listSessions(principal.id()).stream()
            .map(session -> SessionResponse.from(session, currentSessionId))
            .toList();
    }

    /** Revokes one of the caller's own sessions ("log out this device"). */
    @DeleteMapping("/sessions/{sessionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revokeSession(@PathVariable UUID sessionId, @AuthenticationPrincipal AuthenticatedPrincipal principal) {
        requireAuthenticated(principal);
        if (!sessionService.revokeSession(principal.id(), sessionId)) {
            throw new NotFoundException("No se pudo encontrar esa sesión.", "No pudimos encontrar la sesión que ingresaste. Por favor, ingresa de nuevo.");
        }
    }

    /** Revokes every one of the caller's own sessions ("log out everywhere"). */
    @DeleteMapping("/sessions")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revokeAllSessions(@AuthenticationPrincipal AuthenticatedPrincipal principal) {
        requireAuthenticated(principal);
        sessionService.revokeAllForUser(principal.id());
    }

    private LoginResponse respond(AuthService.LoginResult result, HttpServletResponse res) {
        setCookie(res, result.refreshToken());
        return result.response();
    }

    private void requireAuthenticated(AuthenticatedPrincipal principal) {
        if (principal == null) {
            throw new AccessDeniedException("Necesitás iniciar sesión.");
        }
    }

    private void requireCsrfHeader(HttpServletRequest req) {
        if (!CSRF_HEADER_VALUE.equals(req.getHeader(CSRF_HEADER))) {
            throw new BadRequestException("Solicitud inválida.", "La solicitud no es válida. Por favor, ingresa de nuevo.");
        }
    }

    private void blacklistCurrentToken(HttpServletRequest req) {
        String header = req.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            return;
        }
        try {
            Claims claims = jwtService.parseClaims(header.substring(7));
            if (claims.getId() != null) {
                sessionService.blacklist(claims.getId(), claims.getExpiration().toInstant());
            }
        } catch (JwtException | IllegalArgumentException ignored) {
            // Already expired/invalid -- nothing to blacklist.
        }
    }

    private void setCookie(HttpServletResponse res, String rawToken) {
        res.addHeader(HttpHeaders.SET_COOKIE, buildCookie(rawToken, refreshTtl).toString());
    }

    private void clearCookie(HttpServletResponse res) {
        res.addHeader(HttpHeaders.SET_COOKIE, buildCookie("", Duration.ZERO).toString());
    }

    private ResponseCookie buildCookie(String value, Duration maxAge) {
        return ResponseCookie.from(REFRESH_COOKIE, value)
            .httpOnly(true)
            .secure(cookieSecure)
            .sameSite("None")
            .path("/auth")
            .maxAge(maxAge)
            .build();
    }

    private Optional<String> readCookie(HttpServletRequest req) {
        if (req.getCookies() == null) {
            return Optional.empty();
        }
        return Arrays.stream(req.getCookies())
            .filter(c -> REFRESH_COOKIE.equals(c.getName()))
            .map(jakarta.servlet.http.Cookie::getValue)
            .findFirst();
    }

    private String userAgent(HttpServletRequest req) {
        String ua = req.getHeader("User-Agent");
        return ua == null ? "" : ua;
    }
}
