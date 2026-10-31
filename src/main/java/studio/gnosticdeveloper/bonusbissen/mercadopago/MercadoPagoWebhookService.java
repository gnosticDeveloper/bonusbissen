package studio.gnosticdeveloper.bonusbissen.mercadopago;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import studio.gnosticdeveloper.bonusbissen.entity.MercadoPagoPayment;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.entity.PaymentStatus;
import studio.gnosticdeveloper.bonusbissen.repository.InvoiceRepository;
import studio.gnosticdeveloper.bonusbissen.repository.MercadoPagoPaymentRepository;
import studio.gnosticdeveloper.bonusbissen.repository.OrganizationRepository;
import studio.gnosticdeveloper.bonusbissen.service.InvoiceService;

/**
 * Handles the two notification types this integration cares about:
 * {@code subscription_preapproval} (the org's authorization itself changed
 * state) and {@code subscription_authorized_payment} (a recurring charge
 * was attempted). Everything else is logged and ignored.
 *
 * Every approved payment is recorded in {@code mercado_pago_payments}, keyed
 * by MP's id -- repeat notifications for it are no-ops, and one that arrives
 * before its invoice is held there until InvoiceService generates the invoice
 * (see 11__mercadopago_payments.sql).
 *
 * Field names read off the fetched MP resources ("status", "payment.status",
 * "preapproval_id", "external_reference", "transaction_amount", "currency_id")
 * follow MP's published docs, not a live sandbox response yet -- the raw
 * resource is logged at DEBUG to check them against.
 */
@Service
public class MercadoPagoWebhookService {

    private static final Logger log = LoggerFactory.getLogger(MercadoPagoWebhookService.class);

    private static final String STATUS_APPROVED = "approved";

    private final MercadoPagoClient client;
    private final OrganizationRepository organizationRepository;
    private final InvoiceRepository invoiceRepository;
    private final MercadoPagoPaymentRepository paymentRepository;
    private final InvoiceService invoiceService;

    public MercadoPagoWebhookService(
        MercadoPagoClient client,
        OrganizationRepository organizationRepository,
        InvoiceRepository invoiceRepository,
        MercadoPagoPaymentRepository paymentRepository,
        InvoiceService invoiceService
    ) {
        this.client = client;
        this.organizationRepository = organizationRepository;
        this.invoiceRepository = invoiceRepository;
        this.paymentRepository = paymentRepository;
        this.invoiceService = invoiceService;
    }

    /**
     * The transactional boundary lives here, not on the two handlers below --
     * this is the method actually called from outside (the controller), so
     * it goes through Spring's proxy. {@code @Transactional} on a method only
     * reachable via this-calls (self-invocation) is silently ignored at
     * runtime, which is exactly how the handlers were called before this was
     * fixed.
     */
    @Transactional
    public void handle(String type, String dataId) {
        if (type == null || dataId == null) {
            log.info("Ignoring Mercado Pago notification with no type or data id (type={}, dataId={})", type, dataId);
            return;
        }
        switch (type) {
            case "subscription_preapproval" -> handlePreapprovalUpdate(dataId);
            case "subscription_authorized_payment" -> handleAuthorizedPayment(dataId);
            default -> log.info("Ignoring Mercado Pago notification of type {}", type);
        }
    }

    private void handlePreapprovalUpdate(String preapprovalId) {
        Map<String, Object> preapproval = client.getPreapproval(preapprovalId);
        String status = stringOrNull(preapproval.get("status"));

        organizationRepository.findByMercadoPagoPreapprovalId(preapprovalId).ifPresentOrElse(
            org -> {
                org.setMercadoPagoPreapprovalStatus(status);
                organizationRepository.save(org);
                log.info("Organization {} preapproval {} is now {}", org.getId(), preapprovalId, status);
            },
            () -> log.warn("Received preapproval update for unknown preapproval {}", preapprovalId)
        );
    }

    private void handleAuthorizedPayment(String authorizedPaymentId) {
        // Cheap early exit for repeats before calling back out to MP; re-checked
        // below once the org row is locked, which is what actually serializes
        // two concurrent deliveries of the same notification.
        if (paymentRepository.existsById(authorizedPaymentId)) {
            log.info("Authorized payment {} was already recorded, ignoring repeat notification", authorizedPaymentId);
            return;
        }

        Map<String, Object> payment = client.getAuthorizedPayment(authorizedPaymentId);
        log.debug("Mercado Pago authorized payment {}: {}", authorizedPaymentId, payment);

        String preapprovalId = stringOrNull(payment.get("preapproval_id"));
        if (!isApproved(payment)) {
            log.info("Authorized payment {} for preapproval {} isn't approved (status={}, payment={}), not recording it",
                authorizedPaymentId, preapprovalId, payment.get("status"), payment.get("payment"));
            return;
        }

        Organization org = findOrganizationForUpdate(preapprovalId, stringOrNull(payment.get("external_reference"))).orElse(null);
        if (org == null) {
            log.warn("Received approved authorized payment {} for unknown preapproval {}", authorizedPaymentId, preapprovalId);
            return;
        }
        if (paymentRepository.existsById(authorizedPaymentId)) {
            log.info("Authorized payment {} was already recorded, ignoring repeat notification", authorizedPaymentId);
            return;
        }

        MercadoPagoPayment record = new MercadoPagoPayment();
        record.setAuthorizedPaymentId(authorizedPaymentId);
        record.setOrganization(org);
        record.setAmount(decimalOrNull(payment.get("transaction_amount")));
        record.setCurrency(stringOrNull(payment.get("currency_id")));
        MercadoPagoPayment saved = paymentRepository.save(record);

        invoiceRepository.findFirstByOrganizationIdAndPaymentStatusOrderByCreatedAtAsc(org.getId(), PaymentStatus.PENDING).ifPresentOrElse(
            invoice -> invoiceService.applyPayment(invoice, saved),
            () -> log.info("Authorized payment {} for organization {} has no pending invoice yet; held until the next one is generated",
                authorizedPaymentId, org.getId())
        );
    }

    /**
     * By preapproval id first; falls back to external_reference (the org id,
     * set at checkout) so a charge on an org's previous preapproval still finds
     * its org after a re-checkout replaced the stored id.
     */
    private Optional<Organization> findOrganizationForUpdate(String preapprovalId, String externalReference) {
        Optional<Organization> byPreapproval = preapprovalId == null
            ? Optional.empty()
            : organizationRepository.findForUpdateByMercadoPagoPreapprovalId(preapprovalId);
        if (byPreapproval.isPresent() || externalReference == null) {
            return byPreapproval;
        }
        try {
            return organizationRepository.findByIdForUpdate(UUID.fromString(externalReference));
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    /**
     * An authorized payment's own top-level {@code status} is the charge
     * schedule's state (scheduled/processed/recycling/cancelled) -- whether
     * money actually moved is the nested {@code payment.status}.
     */
    private static boolean isApproved(Map<String, Object> authorizedPayment) {
        return authorizedPayment.get("payment") instanceof Map<?, ?> payment && STATUS_APPROVED.equals(payment.get("status"));
    }

    private static String stringOrNull(Object value) {
        return value == null ? null : value.toString();
    }

    private static BigDecimal decimalOrNull(Object value) {
        if (value == null) return null;
        try {
            return new BigDecimal(value.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
