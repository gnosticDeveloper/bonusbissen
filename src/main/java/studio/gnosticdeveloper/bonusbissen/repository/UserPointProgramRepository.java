package studio.gnosticdeveloper.bonusbissen.repository;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import studio.gnosticdeveloper.bonusbissen.entity.UserPointProgram;

public interface UserPointProgramRepository extends JpaRepository<UserPointProgram, UUID> {
    boolean existsByUser_IdAndPointProgram_Id(UUID userId, UUID pointProgramId);

    /** Distinct loyalty members across every program the organization runs. */
    @Query("select count(distinct upp.user.id) from UserPointProgram upp where upp.pointProgram.organization.id = :organizationId")
    int countDistinctUsersByOrganizationId(@Param("organizationId") UUID organizationId);
}
