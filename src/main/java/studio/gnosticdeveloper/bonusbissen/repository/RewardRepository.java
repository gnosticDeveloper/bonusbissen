package studio.gnosticdeveloper.bonusbissen.repository;

import studio.gnosticdeveloper.bonusbissen.entity.Reward;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RewardRepository extends JpaRepository<Reward, UUID> {
    List<Reward> findByActiveTrue();
}
