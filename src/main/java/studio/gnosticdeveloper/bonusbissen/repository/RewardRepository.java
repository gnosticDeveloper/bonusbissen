package studio.gnosticdeveloper.bonusbissen.repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
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
        value = """
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
        order by r.created_at desc, r.id
        """,
        countQuery = """
        select count(r.id) from rewards r
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
    Page<Reward> findByActiveTrue(
        @Param("search") String search,
        @Param("organizationId") UUID organizationId,
        @Param("programId") UUID programId,
        Pageable pageable
    );

    /**
     * Claims per reward of one program made since {@code since}, pending included and cancelled
     * excluded; deleted (deactivated) rewards are left out. The date filter is a range scan on
     * (point_program_id, created_at). No
     * {@code transaction_type = 'redeem'} test: only redeem rows carry a reward_id (check
     * constraint), and that predicate made the planner AND in idx_exchanges_user_id, a partial
     * index over every redemption ever, which took seconds on a large table.
     */
    @Query(
        value = """
        select r.id as id, r.title as title, cast(count(tx.id) as integer) as claim_count, r.cost_points as points
        from point_transactions tx
        join rewards r on r.id = tx.reward_id
        where tx.state != 'cancelled'
          and tx.point_program_id = :programId
          and tx.created_at >= :since
          and r.active = true
        group by r.id, r.title, r.cost_points
        order by count(tx.id) desc, r.id
        """,
        nativeQuery = true
    )
    List<Object[]> findTopRewardsRaw(@Param("programId") UUID programId, @Param("since") OffsetDateTime since, Pageable pageable);

    default List<TopRewardResponse> getTopRewards(UUID programId, OffsetDateTime since, Pageable pageable) {
        return findTopRewardsRaw(programId, since, pageable)
            .stream()
            .map(row -> new TopRewardResponse((UUID) row[0], (String) row[1], ((Number) row[2]).intValue(), ((Number) row[3]).intValue()))
            .toList();
    }

    /**
     * Active rewards of one program with no claim (pending or delivered) since {@code since}. Rewards created
     * after {@code since} are left out: they haven't been in the catalog for the whole window,
     * so having no claims yet says nothing about them. Oldest first.
     */
    @Query(
        value = """
        select r.* from rewards r
        where r.point_program_id = :programId
          and r.active = true
          and r.created_at < :since
          and not exists (
                select 1 from point_transactions tx
                where tx.reward_id = r.id and tx.transaction_type = 'redeem'
                  and tx.state != 'cancelled' and tx.created_at >= :since)
        order by r.created_at, r.id
        """,
        nativeQuery = true
    )
    List<Reward> findUnclaimedSince(@Param("programId") UUID programId, @Param("since") OffsetDateTime since);
}
