package studio.gnosticdeveloper.bonusbissen.repository;

import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import studio.gnosticdeveloper.bonusbissen.dto.response.TopRewardResponse;
import studio.gnosticdeveloper.bonusbissen.entity.Reward;

public interface RewardRepository extends JpaRepository<Reward, UUID> {
    @Query(
        """
        SELECT r FROM Reward r
        WHERE r.active = true
          AND (
               CAST(:search AS string) IS NULL
               OR LOWER(r.title) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%'))
               OR LOWER(r.description) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%'))
          )
        """
    )
    List<Reward> findByActiveTrue(@Param("search") String search);

    @Query(
        value = "select new studio.gnosticdeveloper.bonusbissen.dto.response.TopRewardResponse(r.id, r.title, cast(count(tx) as integer), r.costPoints) " +
                "from PointTransaction tx, Reward r " +
                "where tx.state != 'cancelled' and tx.reward.id = r.id " +
                "group by r.id, r.title, r.costPoints order by count(tx) DESC"
    )
    List<TopRewardResponse> getTopRewards(Pageable pageable);
}
