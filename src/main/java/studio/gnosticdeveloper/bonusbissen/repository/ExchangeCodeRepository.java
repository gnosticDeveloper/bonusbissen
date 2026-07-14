package studio.gnosticdeveloper.bonusbissen.repository;

import studio.gnosticdeveloper.bonusbissen.entity.ExchangeCode;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ExchangeCodeRepository extends JpaRepository<ExchangeCode, UUID> {
}
