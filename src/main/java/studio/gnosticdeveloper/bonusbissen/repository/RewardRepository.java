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
        value =
            """
            select * from rewards r
            where r.active = true
              and (cast(:organizationId as uuid) is null or r.organization_id = :organizationId)
              and (
                   cast(:search as text) is null
                   or lower(r.title) like lower(concat('%', cast(:search as text), '%'))
                   or lower(r.description) like lower(concat('%', cast(:search as text), '%'))
              )
            """,
        nativeQuery = true
    )
    List<Reward> findByActiveTrue(@Param("search") String search, @Param("organizationId") UUID organizationId);


    @Query(
        value =
            """
            select r.id as id, r.title as title, cast(count(tx.id) as integer) as claim_count, r.cost_points as points
            from point_transactions tx
            join rewards r on r.id = tx.reward_id
            where tx.state != 'cancelled' and r.organization_id = :organizationId
            group by r.id, r.title, r.cost_points
            order by count(tx.id) desc
            """,
        nativeQuery = true
    )
    List<Object[]> findTopRewardsRaw(@Param("organizationId") UUID organizationId, Pageable pageable);

    default List<TopRewardResponse> getTopRewards(UUID organizationId, Pageable pageable) {
        return findTopRewardsRaw(organizationId, pageable)
            .stream()
            .map(row -> new TopRewardResponse((UUID) row[0], (String) row[1], ((Number) row[2]).intValue(), ((Number) row[3]).intValue()))
            .toList();
    }
}
