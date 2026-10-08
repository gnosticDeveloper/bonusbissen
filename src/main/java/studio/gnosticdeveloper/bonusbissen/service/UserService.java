package studio.gnosticdeveloper.bonusbissen.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.PreparedStatementCallback;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import studio.gnosticdeveloper.bonusbissen.dto.request.ClaimRewardRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.GrantPointsRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.GrantPointsUpdateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.UserUpdateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.AdminUserInfoResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.ClaimRewardResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.HistoricalExchangeResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.HomeStatsResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.MovementResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.PointActionResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.TopClientResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.UserPointsAwardResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.UserPointsResponse;
import studio.gnosticdeveloper.bonusbissen.entity.ExchangeCode;
import studio.gnosticdeveloper.bonusbissen.entity.OperationType;
import studio.gnosticdeveloper.bonusbissen.entity.OrganizationStaff;
import studio.gnosticdeveloper.bonusbissen.entity.PointProgram;
import studio.gnosticdeveloper.bonusbissen.entity.PointTransaction;
import studio.gnosticdeveloper.bonusbissen.entity.Reward;
import studio.gnosticdeveloper.bonusbissen.entity.Storefront;
import studio.gnosticdeveloper.bonusbissen.entity.TransactionState;
import studio.gnosticdeveloper.bonusbissen.entity.TransactionType;
import studio.gnosticdeveloper.bonusbissen.entity.User;
import studio.gnosticdeveloper.bonusbissen.exception.BadRequestException;
import studio.gnosticdeveloper.bonusbissen.exception.ConflictException;
import studio.gnosticdeveloper.bonusbissen.exception.IncorrectPasswordException;
import studio.gnosticdeveloper.bonusbissen.exception.InsufficientPointsException;
import studio.gnosticdeveloper.bonusbissen.exception.NotFoundException;
import studio.gnosticdeveloper.bonusbissen.repository.ExchangeCodeRepository;
import studio.gnosticdeveloper.bonusbissen.repository.OrganizationStaffRepository;
import studio.gnosticdeveloper.bonusbissen.repository.PointTransactionRepository;
import studio.gnosticdeveloper.bonusbissen.repository.RewardRepository;
import studio.gnosticdeveloper.bonusbissen.repository.StorefrontRepository;
import studio.gnosticdeveloper.bonusbissen.repository.UserPointProgramRepository;
import studio.gnosticdeveloper.bonusbissen.repository.UserRepository;
import studio.gnosticdeveloper.bonusbissen.security.SessionService;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PointTransactionRepository pointTransactionRepository;
    private final RewardRepository rewardRepository;
    private final ExchangeCodeRepository exchangeCodeRepository;
    private final OrganizationStaffRepository organizationStaffRepository;
    private final StorefrontRepository storefrontRepository;
    private final UserPointProgramRepository userPointProgramRepository;
    private final EmailVerificationService emailVerificationService;
    private final PasswordEncoder passwordEncoder;
    private final TraceabilityService traceabilityService;
    private final JdbcTemplate jdbcTemplate;
    private final SessionService sessionService;

    public UserService(
        UserRepository userRepository,
        PointTransactionRepository pointTransactionRepository,
        RewardRepository rewardRepository,
        ExchangeCodeRepository exchangeCodeRepository,
        OrganizationStaffRepository organizationStaffRepository,
        StorefrontRepository storefrontRepository,
        UserPointProgramRepository userPointProgramRepository,
        EmailVerificationService emailVerificationService,
        PasswordEncoder passwordEncoder,
        TraceabilityService traceabilityService,
        JdbcTemplate jdbcTemplate,
        SessionService sessionService
    ) {
        this.userRepository = userRepository;
        this.pointTransactionRepository = pointTransactionRepository;
        this.rewardRepository = rewardRepository;
        this.exchangeCodeRepository = exchangeCodeRepository;
        this.organizationStaffRepository = organizationStaffRepository;
        this.storefrontRepository = storefrontRepository;
        this.userPointProgramRepository = userPointProgramRepository;
        this.emailVerificationService = emailVerificationService;
        this.passwordEncoder = passwordEncoder;
        this.traceabilityService = traceabilityService;
        this.jdbcTemplate = jdbcTemplate;
        this.sessionService = sessionService;
    }

    /** Resets the password of a currently-active staff account -- scoped to the calling admin's own organization. */
    @Transactional
    public void resetPassword(UUID userId, String newPassword, UUID callerOrganizationId) {
        OrganizationStaff staff = organizationStaffRepository
            .findByUserIdAndActiveTrue(userId)
            .orElseThrow(() ->
                new NotFoundException(
                    "Active staff membership not found for user ID " + userId + ".",
                    "No pudimos encontrar al empleado seleccionado."
                )
            );

        if (!staff.getOrganization().getId().equals(callerOrganizationId)) {
            throw new NotFoundException(
                "Staff member with user ID " + userId + " does not belong to organization " + callerOrganizationId + ".",
                "No pudimos encontrar al empleado seleccionado."
            );
        }

        User user = userRepository
            .findById(userId)
            .orElseThrow(() ->
                new NotFoundException(
                    "User with ID " + userId + " was not found while resetting staff password.",
                    "No pudimos encontrar al empleado seleccionado."
                )
            );

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        sessionService.revokeAllForUser(userId);
    }

    /** Self-service password change: any authenticated account, own password only, current password required. */
    @Transactional
    public void changeOwnPassword(UUID userId, String currentPassword, String newPassword) {
        User user = userRepository
            .findById(userId)
            .orElseThrow(() ->
                new NotFoundException("User with ID " + userId + " was not found while changing password.", "No pudimos encontrar tu usuario.")
            );

        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new IncorrectPasswordException("User provided an incorrect current password.", "La contraseña actual es incorrecta.");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        sessionService.revokeAllForUser(userId);
    }

    @Transactional
    public HomeStatsResponse getHomeStats(UUID organizationId) {
        int totalExchanges = pointTransactionRepository.countByTransactionType(TransactionType.REDEEM, organizationId);
        int pendingExchanges = pointTransactionRepository.countByTransactionTypeStatePending(TransactionType.REDEEM, organizationId);
        int totalUsers = userPointProgramRepository.countDistinctUsersByOrganizationId(organizationId);
        int totalPointsAwarded = pointTransactionRepository.calculatePointsAwarded(TransactionType.EARN, organizationId);

        return new HomeStatsResponse(totalExchanges, pendingExchanges, totalUsers, totalPointsAwarded);
    }

    @Transactional(readOnly = true)
    public AdminUserInfoResponse getAdminUserInfo(UUID userId, UUID organizationId) {
        return userRepository
            .findAdminUserInfo(userId, organizationId)
            .orElseThrow(() ->
                new NotFoundException(
                    "Active staff membership was not found for user ID " + userId + " in organization " + organizationId + ".",
                    "No pudimos encontrar al empleado seleccionado."
                )
            );
    }

    @Transactional(readOnly = true)
    public User getById(UUID id) {
        return userRepository
            .findById(id)
            .orElseThrow(() -> new NotFoundException("User with ID " + id + " was not found.", "No pudimos encontrar al cliente seleccionado."));
    }

    @Transactional(readOnly = true)
    public List<UUID> getJoinedStorefrontIds(UUID userId) {
        return storefrontRepository.findIdsByMemberUserId(userId);
    }

    /**
     * A user edits their own profile: display name plus an optional email.
     * Changing the email (or clearing it) drops the verified flag; when a new
     * address is set, a fresh verification message goes out.
     */
    @Transactional
    public User update(UUID id, UserUpdateRequest request) {
        User user = userRepository
            .findById(id)
            .orElseThrow(() ->
                new NotFoundException("User with ID " + id + " was not found while updating profile.", "No pudimos encontrar tu usuario.")
            );

        user.setName(request.name().trim());

        String newEmail = EmailVerificationService.normalizeEmail(request.email());
        String currentEmail = EmailVerificationService.normalizeEmail(user.getEmail());
        boolean emailChanged = !Objects.equals(newEmail, currentEmail);

        if (emailChanged) {
            if (newEmail != null) {
                userRepository
                    .findByEmail(newEmail)
                    .filter(other -> !other.getId().equals(id))
                    .ifPresent(other -> {
                        throw new ConflictException(
                            "User attempted to change email to an address already associated with another account.",
                            "Ese email ya está registrado."
                        );
                    });
            }
            user.setEmail(newEmail);
            user.setEmailVerified(false);
        }

        user = userRepository.save(user);

        if (emailChanged && newEmail != null) {
            emailVerificationService.sendVerification(user);
        }
        return user;
    }

    @Transactional
    public void resendOwnVerification(UUID userId) {
        User user = userRepository
            .findById(userId)
            .orElseThrow(() ->
                new NotFoundException(
                    "User with ID " + userId + " was not found while resending email verification.",
                    "No pudimos encontrar tu usuario."
                )
            );

        if (user.getEmail() == null) {
            throw new BadRequestException(
                "Email verification resend requested for an account without an email address.",
                "Tu cuenta no tiene un email asociado."
            );
        }
        if (user.isEmailVerified()) {
            throw new BadRequestException(
                "Email verification resend requested for an already verified email address.",
                "Tu email ya está verificado."
            );
        }
        emailVerificationService.sendVerification(user);
    }

    @Transactional
    public User reactivate(UUID id) {
        User user = userRepository
            .findById(id)
            .orElseThrow(() ->
                new NotFoundException(
                    "User with ID " + id + " was not found while reactivating account.",
                    "No pudimos encontrar al cliente seleccionado."
                )
            );

        user.setActive(true);
        return userRepository.save(user);
    }

    @Transactional
    public void deleteById(UUID id) {
        User user = userRepository
            .findById(id)
            .orElseThrow(() ->
                new NotFoundException(
                    "User with ID " + id + " was not found while deactivating account.",
                    "No pudimos encontrar al cliente seleccionado."
                )
            );

        user.setActive(false);
        userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public int getBalance(UUID userId, UUID programId) {
        return pointTransactionRepository.calculateBalance(userId, programId);
    }

    /** Lean balance lookup for the customer app, which only ever knows the storefront it's showing. */
    @Transactional(readOnly = true)
    public int getBalanceByStorefront(UUID userId, UUID storefrontId) {
        Storefront storefront = storefrontRepository
            .findById(storefrontId)
            .orElseThrow(() ->
                new NotFoundException(
                    "Storefront with ID " + storefrontId + " was not found while resolving user balance.",
                    "No pudimos encontrar el local seleccionado."
                )
            );

        PointProgram program = storefront.getPointProgram();
        if (program == null || !program.isActive()) {
            throw new NotFoundException(
                "Storefront with ID " + storefrontId + " has no active point program.",
                "Esta sucursal no tiene un programa de puntos activo."
            );
        }
        return getBalance(userId, program.getId());
    }

    @Transactional(readOnly = true)
    public UserPointsResponse getUserPointsById(UUID id, UUID programId) {
        User user = userRepository
            .findById(id)
            .orElseThrow(() ->
                new NotFoundException(
                    "User with ID " + id + " was not found while retrieving points.",
                    "No pudimos encontrar al cliente seleccionado."
                )
            );

        Integer points = programId != null ? getBalance(id, programId) : null;
        return UserPointsResponse.from(user, points);
    }

    @Transactional(readOnly = true)
    public List<HistoricalExchangeResponse> getHistoricalExchangesByUserId(UUID userId, UUID storefrontId) {
        UUID organizationId = resolveOrganizationId(storefrontId);

        List<PointTransaction> exchanges = pointTransactionRepository.findExchangeHistory(userId, TransactionType.REDEEM, organizationId);

        Map<UUID, String> codesByTransactionId = loadPendingExchangeCodes(exchanges);

        return exchanges
            .stream()
            .map(ex -> HistoricalExchangeResponse.from(ex, codesByTransactionId.get(ex.getId())))
            .toList();
    }

    @Transactional(readOnly = true)
    public List<MovementResponse> getMovementsByUserId(UUID userId, UUID storefrontId) {
        List<PointTransaction> movements = pointTransactionRepository.findAllByUserIdAndStorefrontIdOrderByCreatedAtDesc(userId, storefrontId);
        return movements.stream().map(MovementResponse::from).toList();
    }

    private UUID resolveOrganizationId(UUID storefrontId) {
        if (storefrontId == null) {
            return null;
        }
        return storefrontRepository
            .findById(storefrontId)
            .map(storefront -> storefront.getOrganization().getId())
            .orElseThrow(() ->
                new NotFoundException(
                    "Storefront with ID " + storefrontId + " was not found while resolving organization.",
                    "No pudimos encontrar el local seleccionado."
                )
            );
    }

    private Map<UUID, String> loadPendingExchangeCodes(List<PointTransaction> exchanges) {
        List<UUID> pendingIds = exchanges
            .stream()
            .filter(ex -> ex.getState() == TransactionState.PENDING)
            .map(PointTransaction::getId)
            .toList();

        if (pendingIds.isEmpty()) {
            return Map.of();
        }

        return exchangeCodeRepository
            .findByPointTransactionIdIn(pendingIds)
            .stream()
            .collect(Collectors.toMap(ec -> ec.getPointTransaction().getId(), ExchangeCode::getCode));
    }

    @Transactional(readOnly = true)
    public Page<UserPointsResponse> search(String search, UUID programId, Pageable pageable) {
        String term = search == null || search.isBlank() ? null : search.trim();
        return userRepository
            .search(term, pageable)
            .map(user -> UserPointsResponse.from(user, programId != null ? getBalance(user.getId(), programId) : null));
    }

    @Transactional(readOnly = true)
    public List<TopClientResponse> getTopClients(UUID organizationId) {
        Pageable topTen = PageRequest.of(0, 10);
        return userRepository.getTopClients(organizationId, topTen);
    }

    @Transactional(readOnly = true)
    public List<PointActionResponse> getGrantHistory(UUID organizationId, UUID userId, int size) {
        Pageable pageable = PageRequest.of(0, size);
        return pointTransactionRepository.findGrantHistory(organizationId, userId, pageable).stream().map(PointActionResponse::from).toList();
    }

    @Transactional
    public UserPointsAwardResponse grantPoints(GrantPointsRequest request, UUID employeeId, UUID storefrontId) {
        if (storefrontId == null) {
            throw new BadRequestException("Point grant attempted without a storefront.", "Elegí un local antes de sumar puntos.");
        }

        OrganizationStaff employee = organizationStaffRepository
            .findByUserIdAndActiveTrue(employeeId)
            .orElseThrow(() ->
                new NotFoundException(
                    "Active staff membership not found for employee user ID " + employeeId + ".",
                    "No pudimos encontrar al empleado que intenta realizar la operación."
                )
            );

        User user = userRepository
            .findById(request.userId())
            .filter(User::isActive)
            .orElseThrow(() ->
                new NotFoundException(
                    "Active customer with ID " + request.userId() + " was not found while granting points.",
                    "No pudimos encontrar al cliente seleccionado."
                )
            );

        Storefront storefront = storefrontRepository
            .findById(storefrontId)
            .orElseThrow(() ->
                new NotFoundException(
                    "Storefront with ID " + storefrontId + " was not found while granting points.",
                    "No pudimos encontrar el local seleccionado."
                )
            );

        PointProgram program = storefront.getPointProgram();
        if (program == null || !program.isActive()) {
            throw new BadRequestException(
                "Point grant attempted for storefront without an active point program.",
                "Este local no tiene un programa de puntos activo."
            );
        }
        if (!userPointProgramRepository.existsByUser_IdAndPointProgram_Id(request.userId(), program.getId())) {
            throw new ConflictException(
                "Point grant attempted for a user who is not enrolled in the point program.",
                "El cliente todavía no se unió a este programa de puntos."
            );
        }

        PointTransaction tx = new PointTransaction();
        tx.setEmployee(employee);
        tx.setPointProgram(program);
        tx.setStorefront(storefront);
        tx.setUser(user);
        tx.setPoints(request.points());
        tx.setNote(request.note());
        tx.setTransactionType(TransactionType.EARN);
        tx.setState(TransactionState.DELIVERED);
        tx = pointTransactionRepository.save(tx);

        Map<String, Object> payload = new HashMap<>();
        payload.put("points", request.points());
        payload.put("storefrontId", storefrontId);
        payload.put("programId", program.getId());
        if (request.note() != null) {
            payload.put("note", request.note());
        }
        traceabilityService.record(OperationType.POINTS_GRANT, employeeId, request.userId(), payload);
        return new UserPointsAwardResponse(tx.getUser().getName(), request.points());
    }

    @Transactional
    public PointActionResponse updateGrant(UUID transactionId, GrantPointsUpdateRequest request, UUID organizationId) {
        PointTransaction tx = getOwnedGrant(transactionId, organizationId);
        tx.setPoints(request.points());
        tx.setNote(request.note());
        tx = pointTransactionRepository.save(tx);
        return PointActionResponse.from(tx);
    }

    @Transactional
    public void deleteGrant(UUID transactionId, UUID organizationId) {
        pointTransactionRepository.delete(getOwnedGrant(transactionId, organizationId));
    }

    private PointTransaction getOwnedGrant(UUID transactionId, UUID organizationId) {
        PointTransaction tx = pointTransactionRepository
            .findById(transactionId)
            .filter(t -> t.getTransactionType() == TransactionType.EARN && t.getEmployee() != null)
            .orElseThrow(() ->
                new NotFoundException(
                    "Point grant transaction with ID " + transactionId + " was not found or is not a valid employee grant.",
                    "No pudimos encontrar el movimiento de puntos seleccionado."
                )
            );

        if (!tx.getEmployee().getOrganization().getId().equals(organizationId)) {
            throw new AccessDeniedException("Attempted to access point grant transaction " + transactionId + " from another organization.");
        }

        return tx;
    }

    @Transactional
    public ClaimRewardResponse claimReward(ClaimRewardRequest request) {
        PointTransaction tx = new PointTransaction();
        User user = userRepository
            .findById(request.userId())
            .filter(User::isActive)
            .orElseThrow(() ->
                new NotFoundException(
                    "Active customer with ID " + request.userId() + " was not found while claiming reward.",
                    "No pudimos encontrar al cliente seleccionado."
                )
            );

        tx.setUser(user);
        Reward reward = rewardRepository
            .findById(request.rewardId())
            .filter(Reward::isActive)
            .orElseThrow(() ->
                new NotFoundException(
                    "Active reward with ID " + request.rewardId() + " was not found while processing claim.",
                    "No pudimos encontrar la recompensa seleccionada."
                )
            );

        tx.setReward(reward);
        tx.setPointProgram(reward.getPointProgram());

        // Balance is a SUM() over point_transactions, not a row we can SELECT ... FOR UPDATE,
        // so concurrent claims racing the same check-then-insert can all see the same
        // pre-redemption balance and all pass. Serialize per (user, program) with a
        // transaction-scoped advisory lock instead -- released automatically on commit/rollback.
        lockBalance(user.getId(), reward.getPointProgram().getId());

        if (getBalance(user.getId(), reward.getPointProgram().getId()) < reward.getCostPoints()) {
            throw new InsufficientPointsException(
                "User with ID " + user.getId() + " has insufficient points to redeem reward with ID " + reward.getId() + ".",
                "No tenés suficientes puntos para canjear \"" + reward.getTitle() + "\"."
            );
        }

        int negativePoints = reward.getCostPoints() * -1;

        tx.setPoints(negativePoints);
        tx.setTransactionType(TransactionType.REDEEM);
        tx.setState(TransactionState.PENDING);
        tx = pointTransactionRepository.save(tx);

        ExchangeCode exchangeCode = new ExchangeCode();
        exchangeCode.setOrganization(reward.getPointProgram().getOrganization());
        exchangeCode.setPointTransaction(tx);
        exchangeCode.setUser(user);
        exchangeCode.setCode(generateExchangeCode());
        exchangeCodeRepository.save(exchangeCode);

        Map<String, Object> payload = new HashMap<>();
        payload.put("rewardId", reward.getId());
        payload.put("costPoints", reward.getCostPoints());
        payload.put("programId", reward.getPointProgram().getId());
        traceabilityService.record(OperationType.REWARD_CLAIM, user.getId(), user.getId(), payload);

        return new ClaimRewardResponse(exchangeCode.getCode());
    }

    /** Serializes balance-affecting reads/writes for one (user, program) pair for the rest of the current transaction. */
    private void lockBalance(UUID userId, UUID programId) {
        jdbcTemplate.execute("SELECT pg_advisory_xact_lock(?, ?)", (PreparedStatementCallback<Void>) ps -> {
            ps.setInt(1, userId.hashCode());
            ps.setInt(2, programId.hashCode());
            ps.execute();
            return null;
        });
    }

    private String generateExchangeCode() {
        ThreadLocalRandom random = ThreadLocalRandom.current();

        StringBuilder code = new StringBuilder(6);

        // First 4 characters: digits
        for (int i = 0; i < 4; i++) {
            code.append(random.nextInt(10));
        }

        // Fifth character: lowercase letter
        code.append((char) ('a' + random.nextInt(26)));

        // Sixth character: digit
        code.append(random.nextInt(10));

        return code.toString().toLowerCase();
    }
}
