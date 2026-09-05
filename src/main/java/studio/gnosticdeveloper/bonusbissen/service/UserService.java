package studio.gnosticdeveloper.bonusbissen.service;

import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.access.AccessDeniedException;
import studio.gnosticdeveloper.bonusbissen.dto.request.ClaimRewardRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.UserUpdateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.GrantPointsRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.GrantPointsUpdateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.UserPointsAwardResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.UserPointsResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.HistoricalExchangeResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.MovementResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.PointActionResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.TopClientResponse;
import studio.gnosticdeveloper.bonusbissen.entity.User;
import studio.gnosticdeveloper.bonusbissen.entity.Employee;
import studio.gnosticdeveloper.bonusbissen.entity.ExchangeCode;
import studio.gnosticdeveloper.bonusbissen.entity.PointTransaction;
import studio.gnosticdeveloper.bonusbissen.entity.Reward;
import studio.gnosticdeveloper.bonusbissen.entity.TransactionState;
import studio.gnosticdeveloper.bonusbissen.entity.TransactionType;
import studio.gnosticdeveloper.bonusbissen.exception.ConflictException;
import studio.gnosticdeveloper.bonusbissen.exception.InsufficientPointsException;
import studio.gnosticdeveloper.bonusbissen.exception.NotFoundException;
import studio.gnosticdeveloper.bonusbissen.repository.UserRepository;
import studio.gnosticdeveloper.bonusbissen.repository.EmployeeRepository;
import studio.gnosticdeveloper.bonusbissen.repository.ExchangeCodeRepository;
import studio.gnosticdeveloper.bonusbissen.repository.PointTransactionRepository;
import studio.gnosticdeveloper.bonusbissen.repository.RewardRepository;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PointTransactionRepository pointTransactionRepository;
    private final RewardRepository rewardRepository;
    private final ExchangeCodeRepository exchangeCodeRepository;
    private final EmployeeRepository employeeRepository;
    private final EmailVerificationService emailVerificationService;

    public UserService(
        UserRepository userRepository,
        PointTransactionRepository pointTransactionRepository,
        RewardRepository rewardRepository,
        ExchangeCodeRepository exchangeCodeRepository,
        EmployeeRepository employeeRepository,
        EmailVerificationService emailVerificationService
    ) {
        this.userRepository = userRepository;
        this.pointTransactionRepository = pointTransactionRepository;
        this.rewardRepository = rewardRepository;
        this.exchangeCodeRepository = exchangeCodeRepository;
        this.employeeRepository = employeeRepository;
        this.emailVerificationService = emailVerificationService;
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
            .orElseThrow(() -> new NotFoundException("No se pudo encontrar un cliente con el ID " + id + "."));

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
                        throw new ConflictException("Ese email ya está registrado.");
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
    public User reactivate(UUID id) {
        User user = userRepository
            .findById(id)
            .orElseThrow(() -> new NotFoundException("No se pudo encontrar un cliente con el ID " + id + "."));

        user.setActive(true);
        return userRepository.save(user);
    }

    @Transactional
    public void deleteById(UUID id) {
        User user = userRepository
            .findById(id)
            .orElseThrow(() -> new NotFoundException("No se pudo encontrar un cliente con el ID " + id + "."));

        user.setActive(false);
        userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public int getBalance(UUID userId) {
        return pointTransactionRepository.calculatePointsByUserId(userId);
    }

    @Transactional(readOnly = true)
    public UserPointsResponse getUserPointsById(UUID id) {
        User user = userRepository
            .findById(id)
            .orElseThrow(() -> new NotFoundException("No se pudo encontrar un cliente con el ID " + id + "."));
        return UserPointsResponse.from(user, getBalance(id));
    }

    @Transactional(readOnly = true)
    public List<HistoricalExchangeResponse> getHistoricalExchangesByUserId(UUID userId) {
        List<PointTransaction> allExchangesByUserId = pointTransactionRepository.findAllByUserIdAndTypeOrderByCreatedAtDesc(
            userId,
            TransactionType.REDEEM
        );
        return allExchangesByUserId.stream().map(HistoricalExchangeResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<MovementResponse> getMovementsByUserId(UUID userId) {
        List<PointTransaction> movements = pointTransactionRepository.findAllByUserIdOrderByCreatedAtDesc(userId);
        return movements.stream().map(MovementResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public Page<UserPointsResponse> search(String search, Pageable pageable) {
        String term = search == null || search.isBlank() ? null : search.trim();
        return userRepository.search(term, pageable).map(user -> UserPointsResponse.from(user, getBalance(user.getId())));
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
    public UserPointsAwardResponse grantPoints(GrantPointsRequest request, UUID employeeId) {
        Employee employee = employeeRepository
            .findById(employeeId)
            .orElseThrow(() -> new NotFoundException("No se pudo encontrar un empleado con el ID " + employeeId + "."));

        PointTransaction tx = new PointTransaction();
        tx.setEmployee(employee);
        tx.setUser(
            userRepository
                .findById(request.userId())
                .filter(User::isActive)
                .orElseThrow(() -> new NotFoundException("No se pudo encontrar un cliente con el ID " + request.userId() + "."))
        );
        tx.setPoints(request.points());
        tx.setNote(request.note());
        tx.setTransactionType(TransactionType.EARN);
        tx.setState(TransactionState.DELIVERED);
        tx = pointTransactionRepository.save(tx);
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
            .orElseThrow(() -> new NotFoundException("No se pudo encontrar un movimiento de puntos con el ID " + transactionId + "."));

        if (!tx.getEmployee().getOrganization().getId().equals(organizationId)) {
            throw new AccessDeniedException("No podés operar sobre un movimiento de puntos de otra organización.");
        }

        return tx;
    }

    @Transactional
    public String claimReward(ClaimRewardRequest request) {
        PointTransaction tx = new PointTransaction();
        User user = userRepository
            .findById(request.userId())
            .filter(User::isActive)
            .orElseThrow(() -> new NotFoundException("No se pudo encontrar un cliente con el ID " + request.userId() + "."));
        tx.setUser(user);
        Reward reward = rewardRepository
            .findById(request.rewardId())
            .filter(Reward::isActive)
            .orElseThrow(() -> new NotFoundException("No se pudo encontrar una recompensa con el ID " + request.rewardId() + "."));
        tx.setReward(reward);

        if (getBalance(user.getId()) < reward.getCostPoints()) {
            throw new InsufficientPointsException("El cliente no tiene puntos suficientes para canjear \"" + reward.getTitle() + "\".");
        }

        int negativePoints = reward.getCostPoints() * -1;

        tx.setPoints(negativePoints);
        tx.setTransactionType(TransactionType.REDEEM);
        tx.setState(TransactionState.PENDING);
        tx = pointTransactionRepository.save(tx);

        ExchangeCode exchangeCode = new ExchangeCode();
        exchangeCode.setOrganization(reward.getOrganization());
        exchangeCode.setPointTransaction(tx);
        exchangeCode.setUser(user);
        exchangeCode.setCode(generateExchangeCode());
        exchangeCodeRepository.save(exchangeCode);
        return exchangeCode.getCode();
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

        return code.toString();
    }
}
