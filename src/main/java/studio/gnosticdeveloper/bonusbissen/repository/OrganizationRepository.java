package studio.gnosticdeveloper.bonusbissen.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;

import java.util.UUID;

public interface OrganizationRepository extends JpaRepository<Organization, UUID> {

    /** Name search for the dashboard sign-in picker; {@code search} may be null. */
    @Query(
        value =
            """
            select * from organizations o
            where cast(:search as text) is null
               or lower(o.name) like lower(concat('%', cast(:search as text), '%'))
            order by o.name
            """,
        countQuery =
            """
            select count(*) from organizations o
            where cast(:search as text) is null
               or lower(o.name) like lower(concat('%', cast(:search as text), '%'))
            """,
        nativeQuery = true
    )
    Page<Organization> search(@Param("search") String search, Pageable pageable);
}
