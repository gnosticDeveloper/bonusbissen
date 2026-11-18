package studio.gnosticdeveloper.bonusbissen.service;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import studio.gnosticdeveloper.bonusbissen.dto.request.ApproveExchangeRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.ApproveExchangeWithCodeRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.CancelExchangeRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.UserCancelExchangeRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.ExchangeResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.PendingExchangeQueueResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.PendingExchangeResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.PendingExchangeReviewResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.PointsSummaryResponse;
import studio.gnosticdeveloper.bonusbissen.entity.ExchangeCode;
import studio.gnosticdeveloper.bonusbissen.entity.OperationType;
import studio.gnosticdeveloper.bonusbissen.entity.OrganizationStaff;
import studio.gnosticdeveloper.bonusbissen.entity.PointTransaction;
import studio.gnosticdeveloper.bonusbissen.entity.Reward;
import studio.gnosticdeveloper.bonusbissen.entity.TransactionState;
import studio.gnosticdeveloper.bonusbissen.entity.TransactionType;
import studio.gnosticdeveloper.bonusbissen.exception.BadRequestException;
import studio.gnosticdeveloper.bonusbissen.exception.ConflictException;
import studio.gnosticdeveloper.bonusbissen.exception.NotFoundException;
import studio.gnosticdeveloper.bonusbissen.repository.ExchangeCodeRepository;
import studio.gnosticdeveloper.bonusbissen.repository.OrganizationStaffRepository;
import studio.gnosticdeveloper.bonusbissen.repository.PointProgramRepository;
import studio.gnosticdeveloper.bonusbissen.repository.PointTransactionRepository;
import studio.gnosticdeveloper.bonusbissen.repository.StorefrontRepository;
import studio.gnosticdeveloper.bonusbissen.storage.DeliveryVariant;
import studio.gnosticdeveloper.bonusbissen.storage.StorageService;

@Service
public class PointTransactionService {

    private static final String DEFAULT_COLOR = "#232027";
    private static final String DEFAULT_POINT_LABEL = "puntos";
    private static final ZoneId ZONE_ARGENTINA = ZoneId.of("America/Argentina/Buenos_Aires");
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.of("es", "AR"));
    /** Upper bound of {@link #getPendingQueue}; the dashboard asks for 6, or for this many to show "all". */
    public static final int MAX_PENDING_QUEUE_LIMIT = 100;

    private final PointTransactionRepository pointTransactionRepository;
    private final ExchangeCodeRepository exchangeCodeRepository;
    private final OrganizationStaffRepository organizationStaffRepository;
    private final PointProgramRepository pointProgramRepository;
    private final StorefrontRepository storefrontRepository;
    private final TraceabilityService traceabilityService;
    private final StorageService storageService;

    public PointTransactionService(
        PointTransactionRepository pointTransactionRepository,
        ExchangeCodeRepository exchangeCodeRepository,
        OrganizationStaffRepository organizationStaffRepository,
        PointProgramRepository pointProgramRepository,
        StorefrontRepository storefrontRepository,
        TraceabilityService traceabilityService,
        StorageService storageService
    ) {
        this.pointTransactionRepository = pointTransactionRepository;
        this.exchangeCodeRepository = exchangeCodeRepository;
        this.organizationStaffRepository = organizationStaffRepository;
        this.pointProgramRepository = pointProgramRepository;
        this.storefrontRepository = storefrontRepository;
        this.traceabilityService = traceabilityService;
        this.storageService = storageService;
    }

    private String resolveThumbnailUrl(String imagePath) {
        return imagePath == null ? null : storageService.resolveUrl(imagePath, DeliveryVariant.THUMBNAIL);
    }

    private ExchangeResponse toExchangeResponse(PointTransaction ex) {
        String formattedDate = ex.getCreatedAt().atZoneSameInstant(ZONE_ARGENTINA).format(DATE_FORMAT);
        Reward reward = ex.getReward();

        return new ExchangeResponse(
            ex.getId(),
            ex.getUser().getId(),
            ex.getUser().getName(),
            ex.getUser().getUsername(),
            ex.getEmployee() != null ? ex.getEmployee().getUser().getName() : null,
            reward != null ? reward.getId() : null,
            reward != null ? reward.getTitle() : null,
            reward != null ? reward.getDescription() : null,
            reward != null ? resolveThumbnailUrl(reward.getImagePath()) : null,
            reward != null ? reward.getDiscountValue() : null,
            reward != null ? reward.getCostPoints() : 0,
            ex.getState().getValue(),
            ex.getPoints(),
            formattedDate
        );
    }

    @Transactional(readOnly = true)
    public List<ExchangeResponse> getAll(UUID organizationId) {
        return pointTransactionRepository.findAllWithRelations(organizationId).stream().map(this::toExchangeResponse).toList();
    }

    @Transactional(readOnly = true)
    public PointsSummaryResponse getSummary(UUID userId) {
        List<PointsSummaryResponse.Membership> memberships = pointTransactionRepository
            .findMembershipRowsRaw(userId)
            .stream()
            .map(PointTransactionService::toMembership)
            .toList();
        long totalPoints = memberships.stream().mapToLong(PointsSummaryResponse.Membership::points).sum();
        return new PointsSummaryResponse(new PointsSummaryResponse.Summary(totalPoints), memberships);
    }

    private static PointsSummaryResponse.Membership toMembership(Object[] row) {
        String unitLabel = (String) row[1];
        String color = row[5] != null ? (String) row[5] : DEFAULT_COLOR;
        String pointLabel = unitLabel != null && !unitLabel.isBlank() ? unitLabel : DEFAULT_POINT_LABEL;
        return new PointsSummaryResponse.Membership(
            String.valueOf(row[0]),
            new PointsSummaryResponse.Org(String.valueOf(row[2]), (String) row[3], (String) row[4], color, (String) row[6]),
            ((Number) row[8]).longValue(),
            pointLabel,
            ((Number) row[9]).longValue(),
            (String) row[7]
        );
    }

    @Transactional(readOnly = true)
    public List<ExchangeResponse> getResolved(UUID organizationId, Pageable pageable) {
        return pointTransactionRepository.findAllResolvedByOrganizationId(organizationId, pageable).stream().map(this::toExchangeResponse).toList();
    }

    /** {@code organizationId} null for a customer viewing their own; non-null to scope a staff caller to their own org -- see the repository query's javadoc. */
    @Transactional
    public List<PendingExchangeResponse> getAllPendingExchangesById(UUID userId, UUID organizationId) {
        return pointTransactionRepository
            .findAllPendingByUserIdOrderByCreatedAtDesc(userId, TransactionState.PENDING, organizationId)
            .stream()
            .map(PendingExchangeResponse::from)
            .toList();
    }

    /** The organization's whole pending queue, every program, oldest first. */
    @Transactional(readOnly = true)
    public List<PendingExchangeReviewResponse> getAllPending(UUID organizationId) {
        return pointTransactionRepository.findPendingQueue(organizationId, null).stream().map(PendingExchangeReviewResponse::from).toList();
    }

    /**
     * The {@code limit} oldest pending redemptions of the selected storefront's program and the
     * size of that program's whole queue; an empty queue when the storefront has no program.
     */
    @Transactional(readOnly = true)
    public PendingExchangeQueueResponse getPendingQueue(UUID organizationId, UUID storefrontId, int limit) {
        if (limit < 1 || limit > MAX_PENDING_QUEUE_LIMIT) {
            throw new BadRequestException(
                "Pending queue limit out of range: " + limit,
                "El límite debe estar entre 1 y " + MAX_PENDING_QUEUE_LIMIT + "."
            );
        }
        Optional<StorefrontRepository.ProgramScope> program = storefrontRepository.findSelectedProgram(storefrontId, organizationId);
        if (program.isEmpty()) {
            return new PendingExchangeQueueResponse(0, List.of());
        }
        UUID programId = program.get().getId();
        List<PendingExchangeReviewResponse> items = pointTransactionRepository
            .findPendingQueueByProgramId(programId, limit)
            .stream()
            .map(PendingExchangeReviewResponse::from)
            .toList();
        // Two statements, so a claim landing in between could leave total one behind the rows.
        long total = Math.max(pointTransactionRepository.countPendingByProgramId(programId), items.size());
        return new PendingExchangeQueueResponse(total, items);
    }

    /** Open redemptions of the selected storefront's program (the sidebar badge); 0 without a program. */
    @Transactional(readOnly = true)
    public int countPending(UUID organizationId, UUID storefrontId) {
        return storefrontRepository
            .findSelectedProgram(storefrontId, organizationId)
            .map(program -> pointTransactionRepository.countPendingByProgramId(program.getId()))
            .orElse(0);
    }

    @Transactional
    public ExchangeResponse verifyExchange(String code, UUID organizationId, UUID storefrontId, UUID callerId) {
        String normalized = normalizeCode(code);
        ExchangeCode exchangeCode = exchangeCodeRepository
            .findActiveByCodeAndOrganizationId(normalized, organizationId)
            .orElseThrow(() ->
                new NotFoundException("The redemption code does not exist.", "No pudimos encontrar el código de intercambio: " + normalized)
            );

        PointTransaction pointTransaction = exchangeCode.getPointTransaction();
        if (pointTransaction == null) {
            throw new NotFoundException(
                "The redemption code has no a exchange.",
                "El código de intercambio no tiene una transacción de puntos hecha: " + normalized
            );
        }

        requireProgramServedAt(pointTransaction, storefrontId);
        recordVerification(pointTransaction, normalized, callerId);

        return toExchangeResponse(pointTransaction);
    }

    private static String normalizeCode(String code) {
        return code == null ? "" : code.trim().toLowerCase();
    }

    /** The redemption's program must be one the caller's active storefront serves, as on the validation page. */
    private void requireProgramServedAt(PointTransaction pointTransaction, UUID storefrontId) {
        if (storefrontId == null) {
            throw new ConflictException(
                "Null storefront provided when trying to verify an exchange code.",
                "Elegí un local antes de validar un canje."
            );
        }
        UUID programId = pointTransaction.getPointProgram().getId();
        if (!pointProgramRepository.existsByIdAndStorefronts_Id(programId, storefrontId)) {
            throw new ConflictException(
                "Invalid storefront when verifying an exchange code.",
                "Ese código no pertenece a un programa de puntos de este local."
            );
        }
    }

    private void recordVerification(PointTransaction pointTransaction, String normalizedCode, UUID callerId) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("transactionId", pointTransaction.getId());
        payload.put("code", normalizedCode);
        traceabilityService.record(OperationType.EXCHANGE_VERIFY, callerId, pointTransaction.getUser().getId(), payload);
    }

    @Transactional
    /** {@code storefrontId} is the approving staff's active storefront, where the reward is handed over; recorded on the redemption. */
    public void approveExchange(ApproveExchangeRequest request, UUID organizationId, UUID callerId, UUID storefrontId) {
        PointTransaction pointTransaction = lockPendingOwned(request.id(), organizationId);
        deliver(pointTransaction, organizationId, callerId, storefrontId);
    }

    /**
     * Approves one specific redemption, but only when {@code code} is the one its customer was
     * given -- the dashboard home's "Validar" button, where staff pick the row first and then ask
     * the customer for their code. Same storefront rule and audit trail as verifying the code and
     * approving it on the validation page.
     */
    @Transactional
    public void approveExchangeWithCode(ApproveExchangeWithCodeRequest request, UUID organizationId, UUID callerId, UUID storefrontId) {
        PointTransaction pointTransaction = lockPendingOwned(request.id(), organizationId);

        String normalized = normalizeCode(request.code());
        ExchangeCode exchangeCode = pointTransaction.getExchangeCode();
        if (exchangeCode == null || !exchangeCode.isActive() || !exchangeCode.getCode().equals(normalized)) {
            throw new BadRequestException(
                "Code does not match redemption " + request.id() + ".",
                "El código no corresponde a este canje. Pedile al cliente que lo revise."
            );
        }
        requireProgramServedAt(pointTransaction, storefrontId);
        recordVerification(pointTransaction, normalized, callerId);

        deliver(pointTransaction, organizationId, callerId, storefrontId);
    }

    /** Row-locks the redemption, then checks it belongs to the caller's organization and is still pending. */
    private PointTransaction lockPendingOwned(UUID id, UUID organizationId) {
        PointTransaction pointTransaction = pointTransactionRepository
            .findByIdForUpdate(id)
            .orElseThrow(() ->
                new NotFoundException(
                    "Point transaction not found: " + id,
                    "No se pudo encontrar un programa de puntos valido para la sucursal seleccionada."
                )
            );
        requireOwnership(pointTransaction, organizationId);

        if (pointTransaction.getState() != TransactionState.PENDING) {
            throw new ConflictException(
                "El canje " + id + " ya fue procesado (" + pointTransaction.getState() + ").",
                "El canje ya fue procesado."
            );
        }
        return pointTransaction;
    }

    private void deliver(PointTransaction pointTransaction, UUID organizationId, UUID callerId, UUID storefrontId) {
        OrganizationStaff employee = organizationStaffRepository
            .findByUserIdAndActiveTrue(callerId)
            .orElseThrow(() ->
                new NotFoundException(
                    "Employee not found: " + callerId,
                    "Hubo un problema al verificar el código. Parece que tu cuenta no pertenece a este local."
                )
            );

        pointTransaction.setState(TransactionState.DELIVERED);
        pointTransaction.setEmployee(employee);
        if (storefrontId != null) {
            storefrontRepository.findByIdAndOrganizationId(storefrontId, organizationId).ifPresent(pointTransaction::setStorefront);
        }
        pointTransactionRepository.save(pointTransaction);

        Map<String, Object> payload = new HashMap<>();
        payload.put("transactionId", pointTransaction.getId());
        payload.put("points", Math.abs(pointTransaction.getPoints()));
        traceabilityService.record(OperationType.EXCHANGE_APPROVE, callerId, pointTransaction.getUser().getId(), payload);
    }

    @Transactional
    public void cancelExchange(CancelExchangeRequest request, UUID organizationId, UUID callerId) {
        PointTransaction pointTransaction = pointTransactionRepository
            .findByIdForUpdate(request.id())
            .orElseThrow(() ->
                new NotFoundException(
                    "Point transaction not found: " + request.id(),
                    "No se pudo encontrar un programa de puntos valido para la sucursal seleccionada."
                )
            );
        requireOwnership(pointTransaction, organizationId);

        if (pointTransaction.getState() != TransactionState.PENDING) {
            throw new ConflictException(
                "El canje " + request.id() + " ya fue procesado (" + pointTransaction.getState() + ").",
                "El canje ya fue procesado."
            );
        }

        OrganizationStaff employee = organizationStaffRepository
            .findByUserIdAndActiveTrue(callerId)
            .orElseThrow(() ->
                new NotFoundException(
                    "Employee not found: " + callerId,
                    "Hubo un problema al verificar el código. Parece que tu cuenta no pertenece a este local."
                )
            );

        pointTransaction.setState(TransactionState.CANCELLED);
        pointTransaction.setEmployee(employee);

        if (pointTransaction.getExchangeCode() != null) {
            pointTransaction.getExchangeCode().setActive(false);
        }

        pointTransactionRepository.save(pointTransaction);

        if (request.shouldRefundPoints()) {
            refundTransaction(pointTransaction);
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("transactionId", pointTransaction.getId());
        payload.put("points", Math.abs(pointTransaction.getPoints()));
        payload.put("refunded", request.shouldRefundPoints());
        traceabilityService.record(OperationType.EXCHANGE_CANCEL, callerId, pointTransaction.getUser().getId(), payload);
    }

    private void requireOwnership(PointTransaction pointTransaction, UUID organizationId) {
        if (!pointTransaction.getOrganization().getId().equals(organizationId)) {
            throw new AccessDeniedException("No podés operar sobre un canje de otra organización.");
        }
    }

    /**
     * Row-locks the redemption like the cashier paths do: with a plain read, a cancel racing an
     * approval would see PENDING, wait on the cashier's lock, then overwrite DELIVERED and refund.
     */
    @Transactional
    public void userCancelExchange(UserCancelExchangeRequest request, UUID callerId) {
        PointTransaction pointTransaction = pointTransactionRepository
            .findByIdForUpdate(request.exchangeId())
            .orElseThrow(() ->
                new NotFoundException(
                    "Point transaction not found: " + request.exchangeId(),
                    "Hubo un problema al encontrar la transacción que seleccionaste."
                )
            );

        if (!pointTransaction.getUser().getId().equals(callerId)) {
            throw new AccessDeniedException("No podés cancelar el canje de otro cliente.");
        }

        if (pointTransaction.getState() != TransactionState.PENDING) {
            throw new ConflictException(
                "El canje " + request.exchangeId() + " ya fue procesado (" + pointTransaction.getState() + ").",
                "El canje ya fue procesado."
            );
        }

        pointTransaction.setState(TransactionState.CANCELLED);

        if (pointTransaction.getExchangeCode() != null) {
            pointTransaction.getExchangeCode().setActive(false);
        }

        pointTransactionRepository.save(pointTransaction);

        refundTransaction(pointTransaction);

        Map<String, Object> payload = new HashMap<>();
        payload.put("transactionId", pointTransaction.getId());
        payload.put("points", Math.abs(pointTransaction.getPoints()));
        traceabilityService.record(OperationType.EXCHANGE_USER_CANCEL, callerId, callerId, payload);
    }

    private void refundTransaction(PointTransaction pointTransaction) {
        PointTransaction refundTransaction = new PointTransaction();
        refundTransaction.setRefundedTransaction(pointTransaction);
        refundTransaction.setUser(pointTransaction.getUser());
        refundTransaction.setPointProgram(pointTransaction.getPointProgram());
        refundTransaction.setStorefront(pointTransaction.getStorefront());
        refundTransaction.setPoints(Math.abs(pointTransaction.getPoints()));
        refundTransaction.setTransactionType(TransactionType.EARN);
        refundTransaction.setState(TransactionState.DELIVERED);
        pointTransactionRepository.save(refundTransaction);
    }
}
