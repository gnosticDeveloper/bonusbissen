package studio.gnosticdeveloper.bonusbissen.repository;

import studio.gnosticdeveloper.bonusbissen.entity.ExchangeCode;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface ExchangeCodeRepository extends JpaRepository<ExchangeCode, UUID> {
    @Query("select ec from ExchangeCode ec where ec.code = :code and ec.active = true")
    Optional<ExchangeCode> findActiveByCode(@Param("code") String code);

    Optional<ExchangeCode> findByPointTransactionId(UUID pointTransactionId);

}
