package studio.gnosticdeveloper.bonusbissen.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import studio.gnosticdeveloper.bonusbissen.entity.Invoice;

public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {

    List<Invoice> findAllByOrganizationIdOrderByCreatedAtDesc(UUID organizationId);

    Optional<Invoice> findByIdAndOrganizationId(UUID id, UUID organizationId);
}
