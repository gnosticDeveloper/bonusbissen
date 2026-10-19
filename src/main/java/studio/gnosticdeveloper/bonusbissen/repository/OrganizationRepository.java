package studio.gnosticdeveloper.bonusbissen.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrganizationRepository extends JpaRepository<Organization, UUID> {

    /** Orgs on a plan whose current cycle has come due -- the driving query for InvoiceGenerationService. */
    List<Organization> findAllByBillingPlanIsNotNullAndNextInvoiceDueAtLessThanEqual(OffsetDateTime now);

    /**
     * Single-org lookup with billingPlan fetch-joined, for callers that will read it
     * after the transaction closes (e.g. OrganizationResponse). billingPlan stays LAZY
     * on the entity itself -- the plain {@link #findById} is what every other caller
     * (search, the invoice scheduler's bulk query) keeps using, so they don't pay for
     * a join they don't need.
     */
    @Query("select o from Organization o left join fetch o.billingPlan where o.id = :id")
    Optional<Organization> findByIdWithBillingPlan(@Param("id") UUID id);

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
