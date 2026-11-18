package studio.gnosticdeveloper.bonusbissen.repository;

import studio.gnosticdeveloper.bonusbissen.entity.ExchangeCode;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExchangeCodeRepository extends JpaRepository<ExchangeCode, UUID> {
    /**
     * The most recent code with this value in the organization, active or not. Only one can be
     * active at a time (see migration 18), and while it is no newer one can be issued, so an
     * active match is always the newest; an inactive one lets staff see the exchange was already
     * resolved instead of a bare "not found".
     */
    @Query(
        value = "select * from exchange_codes where code = :code and organization_id = :organizationId order by created_at desc limit 1",
        nativeQuery = true
    )
    Optional<ExchangeCode> findLatestByCodeAndOrganizationId(@Param("code") String code, @Param("organizationId") UUID organizationId);

    boolean existsByOrganizationIdAndCodeAndActiveTrue(UUID organizationId, String code);

    Optional<ExchangeCode> findByPointTransactionId(UUID pointTransactionId);

    List<ExchangeCode> findByPointTransactionIdIn(Collection<UUID> pointTransactionIds);
}
