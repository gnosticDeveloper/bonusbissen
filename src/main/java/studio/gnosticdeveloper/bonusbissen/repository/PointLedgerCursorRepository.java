package studio.gnosticdeveloper.bonusbissen.repository;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import studio.gnosticdeveloper.bonusbissen.entity.PointLedgerCursor;

public interface PointLedgerCursorRepository extends JpaRepository<PointLedgerCursor, UUID> {
    Optional<PointLedgerCursor> findByUser_IdAndPointProgram_Id(UUID userId, UUID pointProgramId);
}
