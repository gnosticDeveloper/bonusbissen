package studio.gnosticdeveloper.bonusbissen.repository;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import studio.gnosticdeveloper.bonusbissen.entity.Reward;

public interface RewardRepository extends JpaRepository<Reward, UUID> {
    List<Reward> findByActiveTrue();

    // @Query(
    //     value = "select new TopRewardResponse(r.id, r.title, count(tx), r.points) from PointTransaction tx, Reward r where tx.state != 'cancelled' and tx.reward.id = r.id group by r.id, r.title, r.points order by count(tx) DESC"
    // )
    // List<TopRewardResponse> getTopRewards(Pageable pageable);
}
