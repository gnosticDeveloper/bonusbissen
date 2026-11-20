package studio.gnosticdeveloper.bonusbissen.service;

import java.util.UUID;
import org.springframework.stereotype.Service;
import studio.gnosticdeveloper.bonusbissen.exception.SubscriptionLapsedException;
import studio.gnosticdeveloper.bonusbissen.repository.InvoiceRepository;
import studio.gnosticdeveloper.bonusbissen.repository.OrganizationRepository;

/**
 * An organization is "lapsed" when it has a PENDING invoice more than its
 * grace tier's days past due (grace_tiers, see 14__subscription_grace.sql), or
 * when it cancelled its subscription and the period it had paid for has run
 * out (subscription_ends_at, see 15__subscription_cancellation.sql -- no grace
 * on top of that, leaving was its own choice). Orgs with no plan have no
 * invoices and are never lapsed. The rules themselves are the SQL
 * predicates in LapseSql, shared with the discovery queries in StorefrontRepository.
 *
 * Lapsing stops staff from awarding points and customers from starting a
 * redemption or opening the business's pages (402 with a neutral message), and
 * the org vanishes from discovery lists. Everything else keeps working so the
 * org can pay and recover: read-only access, billing itself, and staff
 * resolving redemptions that were already pending.
 */
@Service
public class SubscriptionGuard {

    private final InvoiceRepository invoiceRepository;
    private final OrganizationRepository organizationRepository;

    public SubscriptionGuard(InvoiceRepository invoiceRepository, OrganizationRepository organizationRepository) {
        this.invoiceRepository = invoiceRepository;
        this.organizationRepository = organizationRepository;
    }

    /** Either an invoice overdue past grace, or a cancelled subscription whose paid period has run out. */
    public boolean isLapsed(UUID organizationId) {
        return organizationRepository.isLapsed(organizationId);
    }

    public void requireNotLapsed(UUID organizationId) {
        if (organizationRepository.hasSubscriptionEnded(organizationId)) {
            throw new SubscriptionLapsedException(
                "Organization " + organizationId + " cancelled its subscription and the paid period has ended.",
                "La suscripción de tu organización terminó. Volvé a suscribirte para seguir sumando puntos.",
                SubscriptionLapsedException.STAFF_ENDED_CODE
            );
        }
        if (invoiceRepository.hasInvoiceOverdueBeyondGrace(organizationId)) {
            throw new SubscriptionLapsedException(
                "Organization " + organizationId + " has an invoice overdue beyond its grace period.",
                "La suscripción de tu organización tiene una factura vencida. Regularizá el pago para volver a sumar puntos.",
                SubscriptionLapsedException.STAFF_CODE
            );
        }
    }

    /** Customer-facing variant: same checks, but the message says nothing about billing. */
    public void requireAvailableToCustomers(UUID organizationId) {
        if (isLapsed(organizationId)) {
            throw new SubscriptionLapsedException(
                "Customer reached organization " + organizationId + " while it is lapsed (overdue invoice or ended subscription).",
                "Este negocio no está disponible por el momento.",
                SubscriptionLapsedException.CUSTOMER_CODE
            );
        }
    }
}
