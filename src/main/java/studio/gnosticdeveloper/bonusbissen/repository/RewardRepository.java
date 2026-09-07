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
    // A reward's organization is reachable only through its point program
    // (rewards.point_program_id -> point_programs.organization_id), so every
    // org-scoped query joins point_programs.
    @Query(
        value =
            """
            select r.* from rewards r
            join point_programs pp on pp.id = r.point_program_id
            where r.active = true
              and (cast(:organizationId as uuid) is null or pp.organization_id = :organizationId)
              and (cast(:programId as uuid) is null or r.point_program_id = :programId)
              and (
                   cast(:search as text) is null
                   or lower(r.title) like lower(concat('%', cast(:search as text), '%'))
                   or lower(r.description) like lower(concat('%', cast(:search as text), '%'))
              )
            """,
        nativeQuery = true
    )
    List<Reward> findByActiveTrue(
        @Param("search") String search,
        @Param("organizationId") UUID organizationId,
        @Param("programId") UUID programId
    );


    @Query(
        value =
            """
            select r.id as id, r.title as title, cast(count(tx.id) as integer) as claim_count, r.cost_points as points
            from point_transactions tx
            join rewards r on r.id = tx.reward_id
            join point_programs pp on pp.id = r.point_program_id
            where tx.state != 'cancelled' and pp.organization_id = :organizationId
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
