package studio.gnosticdeveloper.bonusbissen.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import studio.gnosticdeveloper.bonusbissen.entity.Invoice;
import studio.gnosticdeveloper.bonusbissen.entity.PaymentStatus;

public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {

    List<Invoice> findAllByOrganizationIdOrderByCreatedAtDesc(UUID organizationId);

    Optional<Invoice> findByIdAndOrganizationId(UUID id, UUID organizationId);

    /** The invoice an incoming Mercado Pago payment should mark PAID -- oldest first, so a missed month is settled before a newer one. */
    Optional<Invoice> findFirstByOrganizationIdAndPaymentStatusOrderByCreatedAtAsc(UUID organizationId, PaymentStatus paymentStatus);

    @Query(value = "select nextval('invoice_number_seq')", nativeQuery = true)
    long nextInvoiceNumber();

    boolean existsByOrganizationIdAndPaymentStatus(UUID organizationId, PaymentStatus paymentStatus);
}
