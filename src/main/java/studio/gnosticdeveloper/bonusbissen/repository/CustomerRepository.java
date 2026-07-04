package studio.gnosticdeveloper.bonusbissen.repository;

import jakarta.persistence.LockModeType;
import studio.gnosticdeveloper.bonusbissen.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface CustomerRepository extends JpaRepository<Customer, UUID> {
    Optional<Customer> findByDocument(String document);
    boolean existsByDocument(String document);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Customer c where c.document = :document")
    Optional<Customer> findByDocumentForUpdate(String document);
}
