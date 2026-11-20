package studio.gnosticdeveloper.bonusbissen.mercadopago;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Supplier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import studio.gnosticdeveloper.bonusbissen.entity.BillingPlan;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.entity.PaymentStatus;
import studio.gnosticdeveloper.bonusbissen.exception.BadRequestException;
import studio.gnosticdeveloper.bonusbissen.exception.ConflictException;
import studio.gnosticdeveloper.bonusbissen.exception.NotFoundException;
import studio.gnosticdeveloper.bonusbissen.repository.InvoiceRepository;
import studio.gnosticdeveloper.bonusbissen.repository.OrganizationRepository;
import studio.gnosticdeveloper.bonusbissen.repository.SubscriptionOperationLockRepository;

/**
 * Bridges bonusbissen's own billing model ({@link BillingPlan}/{@link Organization})
 * onto Mercado Pago's "subscription, no associated plan, pending payment"
 * flow -- a preapproval is created directly from the org's plan price/currency,
 * with no preapproval_plan and no card_token_id, so the payer picks their own
 * payment method at MP's hosted checkout. See MercadoPagoClient for why the
 * plan-associated flow was dropped.
 *
 * Deliberately not @Transactional: every method here makes HTTP calls to MP,
 * and holding a DB connection/transaction open across those isn't worth it.
 * Writes go through OrganizationRepository#updateMercadoPagoPreapproval instead.
 */
@Service
public class MercadoPagoSubscriptionService {

    private static final Logger log = LoggerFactory.getLogger(MercadoPagoSubscriptionService.class);

    private static final String STATUS_AUTHORIZED = "authorized";
    private static final String STATUS_PENDING = "pending";
    private static final String STATUS_CANCELLED = "cancelled";
    /** Preapproval states MP will never charge from again. */
    private static final Set<String> TERMINAL_STATUSES = Set.of(STATUS_CANCELLED, "finished");
    /** A subscription in one of these is one the org was actually covered by -- cancelling it starts the countdown to losing access. */
    private static final Set<String> ACTIVE_STATUSES = Set.of(STATUS_AUTHORIZED, "paused");

    /** Null-safe (Set.of rejects null lookups) -- a stored status can be null. */
    static boolean isActiveStatus(String status) {
        return status != null && ACTIVE_STATUSES.contains(status);
    }

    /**
     * How long a checkout/cancel may hold its lease before it counts as abandoned. A real
     * operation is a handful of MP calls, seconds at most; this only has to outlast that.
     */
    private static final double OPERATION_LEASE_SECONDS = 120;

    private final MercadoPagoClient client;
    private final OrganizationRepository organizationRepository;
    private final InvoiceRepository invoiceRepository;
    private final SubscriptionOperationLockRepository operationLockRepository;
    private final String backUrl;

    public MercadoPagoSubscriptionService(
        MercadoPagoClient client,
        OrganizationRepository organizationRepository,
        InvoiceRepository invoiceRepository,
        SubscriptionOperationLockRepository operationLockRepository,
        @Value("${app.mercadopago.back-url}") String backUrl
    ) {
        this.client = client;
        this.organizationRepository = organizationRepository;
        this.invoiceRepository = invoiceRepository;
        this.operationLockRepository = operationLockRepository;
        this.backUrl = backUrl;
    }

    /**
     * Creates a preapproval for the org's currently-selected plan and returns
     * MP's hosted checkout link -- the org's admin authorizes the recurring
     * charge there, we never touch card data. Doesn't flip anything to PAID;
     * that only happens via the webhook once MP actually confirms payment.
     *
     * {@code payerEmail} is the Mercado Pago account's email and is independent
     * of the billing email (where invoices are mailed). Resolved as: the one
     * given now, else the one saved from a previous checkout, else the billing
     * email as a last resort. A given one is saved once the checkout is created.
     *
     * An org has at most one live preapproval: an already-authorized one is a
     * conflict; a pending one that still matches the current plan, payer and
     * first-charge date is handed back as is (so repeated clicks give the same
     * link); any other pending/paused one is cancelled at MP before its
     * replacement is created -- otherwise both could end up authorized and
     * charging. The existing one's status is read live from MP, not from the
     * stored copy, in case a webhook was missed.
     */
    public Map<String, Object> createCheckout(UUID organizationId, String payerEmail) {
        return withOrganizationGuard(organizationId, () -> doCreateCheckout(organizationId, payerEmail));
    }

    private Map<String, Object> doCreateCheckout(UUID organizationId, String payerEmail) {
        Organization org = organizationRepository.findByIdWithBillingPlan(organizationId)
            .orElseThrow(() -> new NotFoundException("No se pudo encontrar la organización con ID " + organizationId + ".", "No pudimos encontrar la organización"));

        BillingPlan plan = org.getBillingPlan();
        if (plan == null) {
            throw new BadRequestException("Organization " + organizationId + " has no billing plan selected.", "Elegí un plan antes de continuar.");
        }
        String givenPayerEmail = payerEmail == null || payerEmail.isBlank() ? null : payerEmail.trim();
        String resolvedPayerEmail = givenPayerEmail != null ? givenPayerEmail
            : org.getMercadoPagoPayerEmail() != null ? org.getMercadoPagoPayerEmail()
            : org.getBillingEmail();
        if (resolvedPayerEmail == null) {
            throw new BadRequestException("Organization " + organizationId + " has no Mercado Pago payer email.", "Indicá el email de tu cuenta de Mercado Pago para continuar.");
        }

        String existingId = org.getMercadoPagoPreapprovalId();
        OffsetDateTime wantedStart = firstChargeAt(org);
        if (existingId != null) {
            Map<String, Object> live = client.getPreapproval(existingId);
            String liveStatus = String.valueOf(live.get("status"));
            if (STATUS_AUTHORIZED.equals(liveStatus)) {
                organizationRepository.updateMercadoPagoPreapproval(organizationId, existingId, liveStatus);
                throw new ConflictException(
                    "Organization " + organizationId + " already has authorized preapproval " + existingId + ".",
                    "Tu suscripción de Mercado Pago ya está activa."
                );
            }
            if (STATUS_PENDING.equals(liveStatus) && isStillTheRightCheckout(live, plan, resolvedPayerEmail, givenPayerEmail, org.getMercadoPagoPayerEmail(), wantedStart)) {
                // A repeated click, a refresh, or coming back to finish: hand back the same link
                // instead of cancelling it and creating a replacement (which kills a checkout page
                // the payer may already have open).
                organizationRepository.updateMercadoPagoPreapproval(organizationId, existingId, liveStatus);
                log.info("Reusing pending Mercado Pago checkout {} for organization {}", existingId, organizationId);
                return live;
            }
            if (!TERMINAL_STATUSES.contains(liveStatus)) {
                cancelAtMercadoPago(existingId);
                organizationRepository.updateMercadoPagoPreapproval(organizationId, existingId, STATUS_CANCELLED);
                log.info("Cancelled {} preapproval {} for organization {} before re-checkout", liveStatus, existingId, organizationId);
            }
        }

        Map<String, Object> preapproval = client.createPreapproval(
            "Suscripción bonusbissen - " + plan.getName(),
            plan.getPrice(),
            plan.getCurrency(),
            resolvedPayerEmail,
            org.getId().toString(),
            backUrl,
            wantedStart
        );
        String preapprovalId = String.valueOf(preapproval.get("id"));
        String status = String.valueOf(preapproval.get("status"));
        organizationRepository.updateMercadoPagoPreapproval(organizationId, preapprovalId, status);
        if (givenPayerEmail != null) {
            organizationRepository.updateMercadoPagoPayerEmail(organizationId, givenPayerEmail);
        }

        log.info("Created Mercado Pago checkout for organization {} (plan={}, preapprovalId={}, status={})",
            organizationId, plan.getName(), preapprovalId, status);

        return preapproval;
    }

    /**
     * Cancels the org's Mercado Pago subscription so MP stops charging, and
     * (if it was active) schedules the end of access: the org keeps the period
     * it already paid for, no further invoices are generated, and it is locked
     * once {@code subscription_ends_at} passes. Invoices that already exist
     * are untouched -- pending ones stay payable and subject to the usual
     * overdue lock. Re-subscribing (a new checkout, once MP authorizes it)
     * undoes the cancellation. Idempotent -- an already cancelled/finished
     * preapproval just has its stored status synced. The live status is read
     * from MP first, in case a webhook was missed.
     */
    public void cancelSubscription(UUID organizationId) {
        withOrganizationGuard(organizationId, () -> {
            doCancelSubscription(organizationId);
            return null;
        });
    }

    private void doCancelSubscription(UUID organizationId) {
        Organization org = organizationRepository.findById(organizationId)
            .orElseThrow(() -> new NotFoundException("No se pudo encontrar la organización con ID " + organizationId + ".", "No pudimos encontrar la organización"));

        String preapprovalId = org.getMercadoPagoPreapprovalId();
        if (preapprovalId == null) {
            throw new NotFoundException(
                "Organization " + organizationId + " has no Mercado Pago subscription.",
                "No tenés una suscripción de Mercado Pago para cancelar."
            );
        }

        String liveStatus = String.valueOf(client.getPreapproval(preapprovalId).get("status"));
        // Cancelling a subscription the org never got to authorize (still pending) leaves its
        // access untouched; only an active one starts the run-down to subscription_ends_at.
        // The stored status counts too, in case MP cancelled it and the webhook was missed.
        boolean wasActive = isActiveStatus(liveStatus) || isActiveStatus(org.getMercadoPagoPreapprovalStatus());
        if (!TERMINAL_STATUSES.contains(liveStatus)) {
            cancelAtMercadoPago(preapprovalId);
            liveStatus = STATUS_CANCELLED;
            log.info("Cancelled preapproval {} for organization {}", preapprovalId, organizationId);
        }
        if (wasActive) {
            // Before the status update, so a crash in between leaves a retry that still sees it as active.
            organizationRepository.endSubscriptionAtPaidThrough(organizationId);
        }
        organizationRepository.updateMercadoPagoPreapproval(organizationId, preapprovalId, liveStatus);
    }

    /**
     * Pushes the org's current plan price onto its live preapproval, so MP
     * charges what the next invoice will say. Best-effort, like
     * InvoiceService#sendInvoiceEmail: the plan change itself has already
     * committed, and failing the request over this would misreport it -- a
     * failure is logged, and the resulting mismatch is logged again when the
     * payment is applied (InvoiceService#applyPayment).
     */
    public void syncPlanAmount(UUID organizationId) {
        Organization org = organizationRepository.findByIdWithBillingPlan(organizationId).orElse(null);
        if (org == null || org.getBillingPlan() == null || org.getMercadoPagoPreapprovalId() == null
            || TERMINAL_STATUSES.contains(org.getMercadoPagoPreapprovalStatus())) {
            return;
        }
        BillingPlan plan = org.getBillingPlan();
        try {
            client.updatePreapproval(org.getMercadoPagoPreapprovalId(), Map.of(
                "auto_recurring", Map.of("transaction_amount", plan.getPrice(), "currency_id", plan.getCurrency())
            ));
            log.info("Synced preapproval {} for organization {} to plan {} ({} {})",
                org.getMercadoPagoPreapprovalId(), organizationId, plan.getName(), plan.getPrice(), plan.getCurrency());
        } catch (RuntimeException e) {
            log.error("Failed to sync preapproval {} for organization {} to plan {} -- MP will keep charging the old amount until fixed",
                org.getMercadoPagoPreapprovalId(), organizationId, plan.getName(), e);
        }
    }

    /**
     * A pending preapproval can be handed back only if it would still be created exactly the
     * same today: it has a checkout link, and the price, currency, first-charge date and payer
     * it was made with still match. Anything else (a plan change, a different payer email, an
     * invoice that has since come due) means the old link would authorize the wrong thing, so
     * it's replaced as before.
     *
     * Shaped around what Mercado Pago really returns for a pending subscription (checked
     * against the sandbox): {@code payer_email} comes back as an empty string, so it can't be
     * compared and the payer is judged from what we saved instead; and {@code start_date} is
     * always filled in -- with the creation time when we asked to charge on authorization.
     */
    private static boolean isStillTheRightCheckout(
        Map<String, Object> live, BillingPlan plan, String resolvedPayerEmail, String givenPayerEmail, String savedPayerEmail, OffsetDateTime wantedStart
    ) {
        if (live.get("init_point") == null || !(live.get("auto_recurring") instanceof Map<?, ?> recurring)) {
            return false;
        }
        if (!sameAmount(recurring.get("transaction_amount"), plan.getPrice()) || !plan.getCurrency().equals(recurring.get("currency_id"))) {
            return false;
        }
        return samePayer(live.get("payer_email"), resolvedPayerEmail, givenPayerEmail, savedPayerEmail)
            && sameFirstCharge(recurring.get("start_date"), wantedStart);
    }

    /**
     * When MP echoes the payer email it must match. When it doesn't (the usual case while
     * pending), a newly given email only counts as the same payer if it's the one already saved
     * from the checkout it would be replacing.
     */
    private static boolean samePayer(Object livePayerEmail, String resolvedPayerEmail, String givenPayerEmail, String savedPayerEmail) {
        if (livePayerEmail != null && !livePayerEmail.toString().isBlank()) {
            return resolvedPayerEmail.equalsIgnoreCase(livePayerEmail.toString());
        }
        return givenPayerEmail == null || givenPayerEmail.equalsIgnoreCase(savedPayerEmail);
    }

    private static boolean sameAmount(Object liveAmount, BigDecimal planPrice) {
        try {
            return liveAmount != null && new BigDecimal(liveAmount.toString()).compareTo(planPrice) == 0;
        } catch (NumberFormatException e) {
            return false;
        }
    }

    /**
     * MP always reports a start_date. For a subscription asked to charge on authorization that is
     * just its creation time, so "no wanted date" matches any start that isn't in the future;
     * otherwise the instants must agree.
     */
    private static boolean sameFirstCharge(Object liveStart, OffsetDateTime wantedStart) {
        if (liveStart == null) {
            return wantedStart == null;
        }
        try {
            OffsetDateTime live = OffsetDateTime.parse(liveStart.toString());
            if (wantedStart == null) {
                return !live.isAfter(OffsetDateTime.now().plusMinutes(1));
            }
            return live.toInstant().truncatedTo(ChronoUnit.SECONDS)
                .equals(wantedStart.toInstant().truncatedTo(ChronoUnit.SECONDS));
        } catch (DateTimeParseException e) {
            return false;
        }
    }

    /**
     * A checkout or cancel talks to MP over several HTTP round trips with no DB transaction around
     * them (see the class comment), so nothing else stops two of them for one org from interleaving:
     * both would read the same pending preapproval, both cancel it, and both create a replacement,
     * leaving two live preapprovals that could each end up authorized and charging. So each one
     * first takes the org's lease in subscription_operation_locks (shared by every backend
     * instance, unlike the in-process set this replaced) and the loser gets a 409. A lease left
     * behind by a crash expires after {@link #OPERATION_LEASE_SECONDS}.
     */
    private <T> T withOrganizationGuard(UUID organizationId, Supplier<T> action) {
        UUID holder = UUID.randomUUID();
        if (operationLockRepository.tryAcquire(organizationId, holder, OPERATION_LEASE_SECONDS) == 0) {
            throw new ConflictException(
                "Organization " + organizationId + " already has a Mercado Pago subscription operation in progress.",
                "Ya hay una operación de suscripción en curso. Esperá unos segundos e intentá de nuevo."
            );
        }
        try {
            return action.get();
        } finally {
            try {
                operationLockRepository.release(organizationId, holder);
            } catch (RuntimeException e) {
                // The operation itself is done; a stuck lease just expires on its own.
                log.warn("Could not release the subscription operation lease for organization {}; it will expire", organizationId, e);
            }
        }
    }

    /**
     * Cancels the preapproval at MP. MP answers 400 ("can not modify a cancelled
     * preapproval") if it was cancelled in the meantime -- e.g. from MP's own panel
     * between our status read and this call -- which is the state we wanted anyway, so
     * that's confirmed against the live status and swallowed; anything else is rethrown.
     */
    private void cancelAtMercadoPago(String preapprovalId) {
        try {
            client.updatePreapproval(preapprovalId, Map.of("status", STATUS_CANCELLED));
        } catch (MercadoPagoApiException e) {
            String liveStatus = String.valueOf(client.getPreapproval(preapprovalId).get("status"));
            if (!TERMINAL_STATUSES.contains(liveStatus)) {
                throw e;
            }
            log.info("Preapproval {} was already {} at MP when cancelling it", preapprovalId, liveStatus);
        }
    }

    /**
     * Lines MP's first charge up with the first invoice: with no start_date MP
     * charges on authorization, which for a fresh subscription is a whole
     * cycle before the first invoice exists. If an invoice is already pending,
     * though, charging right away is exactly what settles it.
     */
    private OffsetDateTime firstChargeAt(Organization org) {
        if (invoiceRepository.existsByOrganizationIdAndPaymentStatus(org.getId(), PaymentStatus.PENDING)) {
            return null;
        }
        OffsetDateTime due = org.getNextInvoiceDueAt();
        return due != null && due.isAfter(OffsetDateTime.now()) ? due : null;
    }
}
