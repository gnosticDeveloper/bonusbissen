package studio.gnosticdeveloper.bonusbissen.service;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import studio.gnosticdeveloper.bonusbissen.email.EmailSender;
import studio.gnosticdeveloper.bonusbissen.entity.BillingPlan;
import studio.gnosticdeveloper.bonusbissen.entity.Invoice;
import studio.gnosticdeveloper.bonusbissen.entity.MercadoPagoPayment;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.entity.PaymentStatus;
import studio.gnosticdeveloper.bonusbissen.exception.NotFoundException;
import studio.gnosticdeveloper.bonusbissen.repository.InvoiceRepository;
import studio.gnosticdeveloper.bonusbissen.repository.MercadoPagoPaymentRepository;
import studio.gnosticdeveloper.bonusbissen.repository.OrganizationRepository;
import studio.gnosticdeveloper.bonusbissen.entity.BillingCycle;

@Service
public class InvoiceService {

    private static final Logger log = LoggerFactory.getLogger(InvoiceService.class);

    private static final int MAX_CYCLE_ADVANCE_ITERATIONS = 60;

    private final InvoiceRepository invoiceRepository;
    private final OrganizationRepository organizationRepository;
    private final MercadoPagoPaymentRepository mercadoPagoPaymentRepository;
    private final InvoiceDocumentService invoiceDocumentService;
    private final EmailSender emailSender;

    public InvoiceService(
        InvoiceRepository invoiceRepository,
        OrganizationRepository organizationRepository,
        MercadoPagoPaymentRepository mercadoPagoPaymentRepository,
        InvoiceDocumentService invoiceDocumentService,
        EmailSender emailSender
    ) {
        this.invoiceRepository = invoiceRepository;
        this.organizationRepository = organizationRepository;
        this.mercadoPagoPaymentRepository = mercadoPagoPaymentRepository;
        this.invoiceDocumentService = invoiceDocumentService;
        this.emailSender = emailSender;
    }

    @Transactional(readOnly = true)
    public List<Invoice> listForOrganization(UUID organizationId) {
        return invoiceRepository.findAllByOrganizationIdOrderByCreatedAtDesc(organizationId);
    }

    /** A rendered invoice document and the filename it should be downloaded as. */
    public record InvoicePdf(String filename, byte[] content) {}

    @Transactional(readOnly = true)
    public InvoicePdf getPdf(UUID organizationId, UUID invoiceId) {
        Invoice invoice = findByIdAndOrganization(organizationId, invoiceId);
        return new InvoicePdf(
            "factura-%s.pdf".formatted(InvoiceDocumentService.formatInvoiceNumber(invoice)),
            invoiceDocumentService.generate(invoice.getOrganization(), invoice));
    }

    /**
     * Creates the invoice and advances the org's next-due-date in one
     * transaction -- a crash between the two can't leave an invoice persisted
     * with the due date never advanced, which would make the next cron run
     * re-bill the same period.
     *
     * A Mercado Pago payment that arrived before this invoice existed is
     * applied to it here (see MercadoPagoWebhookService). The org row is locked
     * for the same reason the webhook locks it: see
     * OrganizationRepository#findByIdForUpdate.
     */
    @Transactional
    public Invoice generateForOrganization(UUID organizationId, OffsetDateTime now) {
        Organization org = organizationRepository.findByIdForUpdate(organizationId)
            .orElseThrow(() -> new NotFoundException("No se pudo encontrar la organización con ID " + organizationId + ".", "No pudimos encontrar la organización"));
        BillingPlan plan = org.getBillingPlan();

        Invoice invoice = new Invoice();
        invoice.setOrganization(org);
        invoice.setInvoiceNumber(invoiceRepository.nextInvoiceNumber());
        invoice.setBillingCycle(org.getBillingCycle());
        invoice.setDueAt(org.getNextInvoiceDueAt());
        invoice.setAmount(plan.getPrice());
        invoice.setCurrency(plan.getCurrency());
        invoice.setLineItems(List.of(Map.of("label", plan.getName(), "amount", plan.getPrice())));
        Invoice saved = invoiceRepository.save(invoice);

        org.setNextInvoiceDueAt(advance(org.getNextInvoiceDueAt(), org.getBillingCycle(), now));
        organizationRepository.save(org);

        mercadoPagoPaymentRepository.findFirstByOrganizationIdAndInvoiceIsNullOrderByReceivedAtAsc(org.getId())
            .ifPresent(payment -> applyPayment(saved, payment));

        return saved;
    }

    /**
     * Marks {@code invoice} PAID by {@code payment}. Must run inside the caller's
     * transaction, with the org row already locked. An amount/currency mismatch
     * (e.g. a payment charged at the old price right after a plan change) is
     * logged, not rejected -- the money did move, and refusing it would just
     * leave the invoice PENDING with no way to settle it.
     */
    public void applyPayment(Invoice invoice, MercadoPagoPayment payment) {
        if (payment.getAmount() != null && payment.getAmount().compareTo(invoice.getAmount()) != 0
            || payment.getCurrency() != null && !payment.getCurrency().equals(invoice.getCurrency())) {
            log.warn("Mercado Pago payment {} ({} {}) doesn't match invoice {} ({} {}); marking it paid anyway",
                payment.getAuthorizedPaymentId(), payment.getAmount(), payment.getCurrency(),
                invoice.getId(), invoice.getAmount(), invoice.getCurrency());
        }
        invoice.setPaymentStatus(PaymentStatus.PAID);
        invoice.setPaidAt(OffsetDateTime.now());
        invoice.setPaymentReference(payment.getAuthorizedPaymentId());
        invoiceRepository.save(invoice);
        payment.setInvoice(invoice);
        mercadoPagoPaymentRepository.save(payment);
        log.info("Marked invoice {} PAID via Mercado Pago authorized payment {}", invoice.getId(), payment.getAuthorizedPaymentId());
    }

    /** Best-effort; a delivery failure is logged by the EmailSender, not propagated. */
    public void sendInvoiceEmail(Organization org, Invoice invoice) {
        if (org.getBillingEmail() == null) {
            return;
        }
        byte[] pdf = invoiceDocumentService.generate(org, invoice);
        emailSender.sendInvoiceEmail(org.getBillingEmail(), org.getName(), pdf, "factura-%s.pdf".formatted(InvoiceDocumentService.formatInvoiceNumber(invoice)));
    }

    private Invoice findByIdAndOrganization(UUID organizationId, UUID invoiceId) {
        return invoiceRepository.findByIdAndOrganizationId(invoiceId, organizationId)
            .orElseThrow(() -> new NotFoundException("No se pudo encontrar la factura con ID " + invoiceId + ".", "No pudimos encontrar la factura"));
    }

    private OffsetDateTime advance(OffsetDateTime dueAt, BillingCycle cycle, OffsetDateTime now) {
        OffsetDateTime next = dueAt;
        int iterations = 0;
        while (!next.isAfter(now)) {
            if (++iterations > MAX_CYCLE_ADVANCE_ITERATIONS) {
                break;
            }
            next = next.atZoneSameInstant(ZoneOffset.UTC).plus(cycle.getPeriod()).toOffsetDateTime();
        }
        return next;
    }
}
