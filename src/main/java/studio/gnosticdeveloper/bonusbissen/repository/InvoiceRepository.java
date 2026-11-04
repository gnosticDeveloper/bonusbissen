package studio.gnosticdeveloper.bonusbissen.repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import studio.gnosticdeveloper.bonusbissen.entity.Invoice;
import studio.gnosticdeveloper.bonusbissen.entity.PaymentStatus;

public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {

    List<Invoice> findAllByOrganizationIdOrderByCreatedAtDesc(UUID organizationId);

    Optional<Invoice> findByIdAndOrganizationId(UUID id, UUID organizationId);

    /** The invoice an incoming Mercado Pago payment should mark PAID -- oldest first, so a missed month is settled before a newer one. */
    Optional<Invoice> findFirstByOrganizationIdAndPaymentStatusOrderByCreatedAtAsc(UUID organizationId, PaymentStatus paymentStatus);

    @Query(value = "select nextval('invoice_number_seq')", nativeQuery = true)
    long nextInvoiceNumber();

    /** True when the org has a PENDING invoice that is more than its grace tier's days past due. */
    @Query(value = """
        select exists (
            select 1 from invoices i
            join organizations o on o.id = i.organization_id
            join grace_tiers g on g.name = o.grace_tier
            where o.id = :organizationId
              and i.payment_status = 'pending'
              and i.due_at + make_interval(days => g.grace_days) < :now
        )
        """, nativeQuery = true)
    boolean hasInvoiceOverdueBeyondGrace(@Param("organizationId") UUID organizationId, @Param("now") OffsetDateTime now);

    boolean existsByOrganizationIdAndPaymentStatus(UUID organizationId, PaymentStatus paymentStatus);
}
