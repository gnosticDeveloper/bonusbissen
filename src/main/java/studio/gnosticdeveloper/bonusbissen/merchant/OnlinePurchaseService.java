package studio.gnosticdeveloper.bonusbissen.merchant;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import studio.gnosticdeveloper.bonusbissen.entity.OperationType;
import studio.gnosticdeveloper.bonusbissen.entity.PointProgram;
import studio.gnosticdeveloper.bonusbissen.entity.PointTransaction;
import studio.gnosticdeveloper.bonusbissen.entity.Storefront;
import studio.gnosticdeveloper.bonusbissen.entity.TransactionState;
import studio.gnosticdeveloper.bonusbissen.entity.TransactionType;
import studio.gnosticdeveloper.bonusbissen.entity.User;
import studio.gnosticdeveloper.bonusbissen.exception.BadRequestException;
import studio.gnosticdeveloper.bonusbissen.repository.PointTransactionRepository;
import studio.gnosticdeveloper.bonusbissen.repository.UserRepository;
import studio.gnosticdeveloper.bonusbissen.service.BalanceLockService;
import studio.gnosticdeveloper.bonusbissen.service.EmailVerificationService;
import studio.gnosticdeveloper.bonusbissen.service.PointProgramService;
import studio.gnosticdeveloper.bonusbissen.service.SubscriptionGuard;
import studio.gnosticdeveloper.bonusbissen.service.TraceabilityService;

/**
 * Credits a paid order from an authenticated merchant. The shopper is identified only by the
 * username or email they typed in the merchant's checkout -- not a credential, since the worst
 * a wrong guess does is give someone else points. Unlike staff grants, this path joins the user
 * to the integration's program on the fly (the shopper opted in by typing their account name).
 */
@Service
public class OnlinePurchaseService {

    private final MerchantIntegrationRepository integrationRepository;
    private final UserRepository userRepository;
    private final OnlinePurchaseRepository onlinePurchaseRepository;
    private final PointTransactionRepository pointTransactionRepository;
    private final PointProgramService pointProgramService;
    private final BalanceLockService balanceLockService;
    private final SubscriptionGuard subscriptionGuard;
    private final TraceabilityService traceabilityService;

    public OnlinePurchaseService(
        MerchantIntegrationRepository integrationRepository,
        UserRepository userRepository,
        OnlinePurchaseRepository onlinePurchaseRepository,
        PointTransactionRepository pointTransactionRepository,
        PointProgramService pointProgramService,
        BalanceLockService balanceLockService,
        SubscriptionGuard subscriptionGuard,
        TraceabilityService traceabilityService
    ) {
        this.integrationRepository = integrationRepository;
        this.userRepository = userRepository;
        this.onlinePurchaseRepository = onlinePurchaseRepository;
        this.pointTransactionRepository = pointTransactionRepository;
        this.pointProgramService = pointProgramService;
        this.balanceLockService = balanceLockService;
        this.subscriptionGuard = subscriptionGuard;
        this.traceabilityService = traceabilityService;
    }

    @Transactional
    public PurchaseResponse credit(UUID integrationId, PaidOrder request) {
        // Reloaded here so its lazy program/organization are usable inside this transaction.
        MerchantIntegration integration = integrationRepository.findById(integrationId).orElseThrow();
        validate(integration, request);
        String orderId = request.externalOrderId().trim();

        Storefront storefront = integration.getStorefront();
        PointProgram program = storefront.getPointProgram();
        if (program == null) {
            throw new BadRequestException("Merchant purchase for storefront " + storefront.getId() + " without a program.", "La sucursal no tiene un programa de puntos.");
        }
        if (!program.isActive()) {
            throw new BadRequestException("Merchant purchase for inactive program " + program.getId() + ".", "El programa de puntos no está activo.");
        }
        subscriptionGuard.requireNotLapsed(integration.getOrganization().getId());

        Optional<User> found = resolveUser(request.identifier());
        if (found.isEmpty()) {
            return new PurchaseResponse(PurchaseResponse.UNMATCHED, 0);
        }
        User user = found.get();

        // Serializes retries of the same order (and any join) for this shopper.
        balanceLockService.lock(user.getId(), program.getId());
        Optional<OnlinePurchase> existing = onlinePurchaseRepository.findByIntegration_IdAndOrderId(integration.getId(), orderId);
        if (existing.isPresent()) {
            return new PurchaseResponse(PurchaseResponse.DUPLICATE, existing.get().getPoints());
        }

        int points;
        try {
            points = request.amount().multiply(integration.getPointsPerUnit()).setScale(0, RoundingMode.FLOOR).intValueExact();
        } catch (ArithmeticException e) {
            throw new BadRequestException("Merchant purchase points overflow for order " + orderId + ".", "El monto de la compra no es válido.");
        }

        PointTransaction tx = null;
        if (points > 0) {
            pointProgramService.joinIfMissing(user, program, storefront);
            tx = new PointTransaction();
            tx.setUser(user);
            tx.setPointProgram(program);
            tx.setPoints(points);
            tx.setTransactionType(TransactionType.EARN);
            tx.setState(TransactionState.DELIVERED);
            tx.setNote("Compra online " + integration.getName() + " #" + orderId);
            tx = pointTransactionRepository.save(tx);
        }

        OnlinePurchase purchase = new OnlinePurchase();
        purchase.setIntegration(integration);
        purchase.setOrderId(orderId);
        purchase.setUser(user);
        purchase.setAmount(request.amount());
        purchase.setCurrency(request.currency().toUpperCase(Locale.ROOT));
        purchase.setPoints(points);
        purchase.setTransaction(tx);
        onlinePurchaseRepository.save(purchase);

        if (tx != null) {
            Map<String, Object> payload = new HashMap<>();
            payload.put("integrationId", integration.getId());
            payload.put("orderId", orderId);
            payload.put("transactionId", tx.getId());
            payload.put("programId", program.getId());
            payload.put("points", points);
            payload.put("amount", request.amount().toPlainString());
            payload.put("currency", purchase.getCurrency());
            // No staff member acted, and the log requires an originating user: the shopper stands in for it.
            traceabilityService.record(OperationType.ONLINE_PURCHASE_GRANT, user.getId(), user.getId(), payload);
        }
        return new PurchaseResponse(PurchaseResponse.CREDITED, points);
    }

    private void validate(MerchantIntegration integration, PaidOrder request) {
        if (request == null || isBlank(request.externalOrderId()) || isBlank(request.identifier()) || request.amount() == null || isBlank(request.currency())) {
            throw new BadRequestException("Merchant purchase missing orderId, identifier, amount or currency.", "Faltan datos de la compra.");
        }
        if (request.externalOrderId().trim().length() > 128 || request.identifier().length() > 320) {
            throw new BadRequestException("Merchant purchase field too long.", "Alguno de los datos de la compra es demasiado largo.");
        }
        if (request.amount().signum() <= 0 || request.amount().compareTo(new BigDecimal("1000000000")) >= 0) {
            throw new BadRequestException("Merchant purchase with out-of-range amount " + request.amount() + ".", "El monto de la compra no es válido.");
        }
        if (!integration.getCurrency().equalsIgnoreCase(request.currency().trim())) {
            throw new BadRequestException(
                "Merchant purchase in " + request.currency() + " but integration " + integration.getId() + " is " + integration.getCurrency() + ".",
                "La moneda de la compra no coincide con la de la integración."
            );
        }
    }

    /** An email only matches a verified account; otherwise anyone could register an address they don't own and collect its points. */
    private Optional<User> resolveUser(String rawIdentifier) {
        String identifier = rawIdentifier.trim();
        if (identifier.contains("@")) {
            return userRepository.findByEmail(EmailVerificationService.normalizeEmail(identifier)).filter(User::isEmailVerified).filter(User::isActive);
        }
        return userRepository.findByUsername(identifier.toLowerCase(Locale.ROOT)).filter(User::isActive);
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
