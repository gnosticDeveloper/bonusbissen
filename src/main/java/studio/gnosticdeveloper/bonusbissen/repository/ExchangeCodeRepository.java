package studio.gnosticdeveloper.bonusbissen.repository;

import studio.gnosticdeveloper.bonusbissen.entity.ExchangeCode;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface ExchangeCodeRepository extends JpaRepository<ExchangeCode, UUID> {
    @Query(value = "select * from exchange_codes where code = :code and organization_id = :organizationId and active = true", nativeQuery = true)
    Optional<ExchangeCode> findActiveByCodeAndOrganizationId(@Param("code") String code, @Param("organizationId") UUID organizationId);

    Optional<ExchangeCode> findByPointTransactionId(UUID pointTransactionId);

}
