package studio.gnosticdeveloper.bonusbissen.service;

import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.stereotype.Service;
import studio.gnosticdeveloper.bonusbissen.exception.SubscriptionLapsedException;
import studio.gnosticdeveloper.bonusbissen.repository.InvoiceRepository;

/**
 * An organization is "lapsed" when it has a PENDING invoice more than its
 * grace tier's days past due (grace_tiers, see 14__subscription_grace.sql).
 * Orgs with no plan have no invoices and are never lapsed.
 *
 * Lapsing only stops awarding points; everything read-only, redeeming and
 * billing itself keep working so the org can pay and recover. Customers
 * can't start a redemption or open the business's pages (402 with a neutral
 * message), and the org vanishes from discovery lists (StorefrontRepository).
 */
@Service
public class SubscriptionGuard {

    private final InvoiceRepository invoiceRepository;

    public SubscriptionGuard(InvoiceRepository invoiceRepository) {
        this.invoiceRepository = invoiceRepository;
    }

    public boolean isLapsed(UUID organizationId) {
        return invoiceRepository.hasInvoiceOverdueBeyondGrace(organizationId, OffsetDateTime.now());
    }

    public void requireNotLapsed(UUID organizationId) {
        if (isLapsed(organizationId)) {
            throw new SubscriptionLapsedException(
                "Organization " + organizationId + " has an invoice overdue beyond its grace period.",
                "La suscripción de tu organización tiene una factura vencida. Regularizá el pago para volver a sumar puntos.",
                SubscriptionLapsedException.STAFF_CODE
            );
        }
    }

    /** Customer-facing variant: same check, but the message says nothing about billing. */
    public void requireAvailableToCustomers(UUID organizationId) {
        if (isLapsed(organizationId)) {
            throw new SubscriptionLapsedException(
                "Customer reached organization " + organizationId + " while it has an invoice overdue beyond its grace period.",
                "Este negocio no está disponible por el momento.",
                SubscriptionLapsedException.CUSTOMER_CODE
            );
        }
    }
}
