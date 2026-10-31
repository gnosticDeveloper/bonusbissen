package studio.gnosticdeveloper.bonusbissen.service;

import java.time.OffsetDateTime;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import studio.gnosticdeveloper.bonusbissen.entity.Invoice;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.repository.OrganizationRepository;

/**
 * Daily job that bills every organization whose subscription cycle has come
 * due. Plan assignment, billing cycle and the first due date are all set
 * directly against the database (see 9__billing.sql) -- this job only reacts
 * to {@code organizations.next_invoice_due_at}, it never decides who gets
 * billed.
 *
 * Each organization is processed and emailed independently, with failures
 * logged rather than aborting the batch -- same shape as PointExpirationService.
 */
@Service
public class InvoiceGenerationService {

    private static final Logger log = LoggerFactory.getLogger(InvoiceGenerationService.class);

    private final OrganizationRepository organizationRepository;
    private final InvoiceService invoiceService;

    public InvoiceGenerationService(OrganizationRepository organizationRepository, InvoiceService invoiceService) {
        this.organizationRepository = organizationRepository;
        this.invoiceService = invoiceService;
    }

    @Scheduled(cron = "${app.billing.invoice-cron}")
    public void runScheduledInvoicing() {
        OffsetDateTime now = OffsetDateTime.now();
        List<Organization> due = organizationRepository.findAllByBillingPlanIsNotNullAndNextInvoiceDueAtLessThanEqual(now);
        int processed = 0;
        for (Organization org : due) {
            try {
                processOrganization(org.getId(), now);
                processed++;
            } catch (Exception e) {
                log.error("Failed to generate invoice for organization {}", org.getId(), e);
            }
        }
        log.info("Generated {} invoice(s)", processed);
    }

    // generateForOrganization is InvoiceService's own @Transactional method, called
    // through its proxy -- the invoice-creation + due-date-advance boundary lives
    // there, not here. Emailing happens afterwards, outside that transaction, so a
    // slow/failed send can never roll back an already-committed invoice.
    private void processOrganization(java.util.UUID organizationId, OffsetDateTime now) {
        Invoice invoice = invoiceService.generateForOrganization(organizationId, now);
        invoiceService.sendInvoiceEmail(invoice.getOrganization(), invoice);
    }
}
