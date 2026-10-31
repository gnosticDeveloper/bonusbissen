package studio.gnosticdeveloper.bonusbissen.repository;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import studio.gnosticdeveloper.bonusbissen.entity.MercadoPagoPayment;

public interface MercadoPagoPaymentRepository extends JpaRepository<MercadoPagoPayment, String> {

    /** Oldest payment received ahead of its invoice -- applied by InvoiceService when the next invoice is generated. */
    Optional<MercadoPagoPayment> findFirstByOrganizationIdAndInvoiceIsNullOrderByReceivedAtAsc(UUID organizationId);
}
