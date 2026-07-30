package studio.gnosticdeveloper.bonusbissen.repository;

import jakarta.persistence.LockModeType;
import studio.gnosticdeveloper.bonusbissen.dto.response.TopClientResponse;
import studio.gnosticdeveloper.bonusbissen.entity.Customer;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CustomerRepository extends JpaRepository<Customer, UUID> {
    Optional<Customer> findByPhone(String phone);
    boolean existsByPhone(String phone);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Customer c where c.phone = :phone")
    Optional<Customer> findByPhoneForUpdate(String phone);

    @Query(
        value = "select new studio.gnosticdeveloper.bonusbissen.dto.response.TopClientResponse(c.id, c.name, cast(sum(t.points) as integer)) " +
                "from PointTransaction t, Customer c " +
                "where t.transactionType = studio.gnosticdeveloper.bonusbissen.entity.TransactionType.EARN " +
                "  and t.state = studio.gnosticdeveloper.bonusbissen.entity.TransactionState.DELIVERED " +
                "  and t.customer.id = c.id " +
                "group by c.id, c.name order by sum(t.points) DESC"
    )
    List<TopClientResponse> getTopClients(Pageable pageable);
}
