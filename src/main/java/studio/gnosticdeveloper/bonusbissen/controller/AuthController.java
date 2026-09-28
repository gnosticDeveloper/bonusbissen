package studio.gnosticdeveloper.bonusbissen.controller;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
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
import studio.gnosticdeveloper.bonusbissen.security.AuthenticatedPrincipal;
import studio.gnosticdeveloper.bonusbissen.security.JwtService;
import studio.gnosticdeveloper.bonusbissen.service.AuthService;
import studio.gnosticdeveloper.bonusbissen.service.EmailVerificationService;
import studio.gnosticdeveloper.bonusbissen.service.LoginLinkService;

import java.util.List;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;
    private final EmailVerificationService emailVerificationService;
    private final LoginLinkService loginLinkService;
    private final JwtService jwtService;

    public AuthController(
        AuthService authService,
        EmailVerificationService emailVerificationService,
        LoginLinkService loginLinkService,
        JwtService jwtService
    ) {
        this.authService = authService;
        this.emailVerificationService = emailVerificationService;
        this.loginLinkService = loginLinkService;
        this.jwtService = jwtService;
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
    public LoginResponse dashboardSignIn(@Valid @RequestBody DashboardLoginRequest request) {
        return authService.dashboardLogin(request);
    }

    @PostMapping("/user-register")
    @ResponseStatus(HttpStatus.CREATED)
    public LoginResponse userRegister(@Valid @RequestBody UserRegisterRequest request) {
        return authService.registerUser(request);
    }

    @PostMapping("/user-login")
    public LoginResponse userLogin(@Valid @RequestBody UserLoginRequest request) {
        return authService.loginUser(request);
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
        @AuthenticationPrincipal AuthenticatedPrincipal principal
    ) {
        if (principal == null || !List.of("ADMIN", "CASHIER").contains(principal.role())) {
            throw new org.springframework.security.access.AccessDeniedException("Necesitás iniciar sesión como empleado.");
        }
        return authService.selectStorefront(principal.id(), request.storefrontId());
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
    public LoginResponse consumeUserLoginLink(@Valid @RequestBody LoginLinkConsumeRequest request) {
        return authService.issueUserToken(loginLinkService.consumeUserLink(request.token()));
    }

    /** Always 204, whether or not the identifier/org combination is valid, so the response can't be used to enumerate accounts. */
    @PostMapping("/dashboard/login-link/request")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void requestDashboardLoginLink(@Valid @RequestBody RequestDashboardLoginLinkRequest request) {
        loginLinkService.requestDashboardLink(request.identifier(), request.organizationId());
    }

    @PostMapping("/dashboard/login-link/consume")
    public LoginResponse consumeDashboardLoginLink(@Valid @RequestBody LoginLinkConsumeRequest request) {
        LoginLinkService.StaffLoginLink link = loginLinkService.consumeDashboardLink(request.token());
        return authService.issueStaffToken(link.user(), link.staff());
    }
}
