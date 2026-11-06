package studio.gnosticdeveloper.bonusbissen.repository;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import studio.gnosticdeveloper.bonusbissen.entity.UserPointProgram;

public interface UserPointProgramRepository extends JpaRepository<UserPointProgram, UUID> {
    boolean existsByUser_IdAndPointProgram_Id(UUID userId, UUID pointProgramId);

    /** True if the user has joined at least one of this organization's point programs -- the relationship staff must have before seeing a customer's PII (see UserService#getUserPointsById). */
    @Query("select count(upp) > 0 from UserPointProgram upp where upp.user.id = :userId and upp.pointProgram.organization.id = :organizationId")
    boolean existsByUserIdAndOrganizationId(@Param("userId") UUID userId, @Param("organizationId") UUID organizationId);

    /** Distinct loyalty members across every program the organization runs. */
    @Query("select count(distinct upp.user.id) from UserPointProgram upp where upp.pointProgram.organization.id = :organizationId")
    int countDistinctUsersByOrganizationId(@Param("organizationId") UUID organizationId);
}
