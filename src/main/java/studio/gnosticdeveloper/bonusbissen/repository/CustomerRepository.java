package studio.gnosticdeveloper.bonusbissen.repository;

import studio.gnosticdeveloper.bonusbissen.dto.response.TopClientResponse;
import studio.gnosticdeveloper.bonusbissen.entity.Customer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;


public interface CustomerRepository extends JpaRepository<Customer, UUID> {
    Optional<Customer> findByPhone(String phone);
    boolean existsByPhone(String phone);

    @Query(value = "select * from customers where phone = :phone for update", nativeQuery = true)
    Optional<Customer> findByPhoneForUpdate(@Param("phone") String phone);

    @Query(
        value =
            """
            select * from customers c
            where c.active = true
              and (
                   cast(:search as text) is null
                   or lower(c.name) like lower(concat('%', cast(:search as text), '%'))
                   or c.phone like concat('%', cast(:search as text), '%')
              )
            """,
        countQuery =
            """
            select count(*) from customers c
            where c.active = true
              and (
                   cast(:search as text) is null
                   or lower(c.name) like lower(concat('%', cast(:search as text), '%'))
                   or c.phone like concat('%', cast(:search as text), '%')
              )
            """,
        nativeQuery = true
    )
    Page<Customer> search(@Param("search") String search, Pageable pageable);

    @Query(
        value =
            """
            SELECT c.id AS id, c.name AS name, CAST(SUM(t.points) AS integer) AS total_points
            FROM point_transactions t
            JOIN customers c ON c.id = t.customer_id
            LEFT JOIN employees e ON e.id = t.employee_id
            LEFT JOIN point_transactions rt ON rt.id = t.refunded_transaction_id
            LEFT JOIN rewards rtr ON rtr.id = rt.reward_id
            WHERE t.transaction_type = 'earn'
              AND t.state = 'delivered'
              AND (e.organization_id = :organizationId OR rtr.organization_id = :organizationId)
            GROUP BY c.id, c.name
            ORDER BY SUM(t.points) DESC
            """,
        nativeQuery = true
    )
    List<Object[]> findTopClientsRaw(@Param("organizationId") UUID organizationId, Pageable pageable);

    default List<TopClientResponse> getTopClients(UUID organizationId, Pageable pageable) {
        return findTopClientsRaw(organizationId, pageable)
            .stream()
            .map(row -> new TopClientResponse((UUID) row[0], (String) row[1], ((Number) row[2]).intValue()))
            .toList();
    }
}
