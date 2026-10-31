package studio.gnosticdeveloper.bonusbissen.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrganizationRepository extends JpaRepository<Organization, UUID> {

    /** Orgs on a plan whose current cycle has come due -- the driving query for InvoiceGenerationService. */
    List<Organization> findAllByBillingPlanIsNotNullAndNextInvoiceDueAtLessThanEqual(OffsetDateTime now);

    /** Looks up the org a Mercado Pago webhook notification refers to, by the preapproval id stored at checkout time. */
    Optional<Organization> findByMercadoPagoPreapprovalId(String mercadoPagoPreapprovalId);

    /**
     * Row-locking lookups. Invoice generation and payment application both lock
     * the org first, so a payment arriving while that org's invoice is being
     * generated can't miss it (each would otherwise see neither the other's
     * uncommitted invoice nor payment, and both would stay unmatched).
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from Organization o where o.id = :id")
    Optional<Organization> findByIdForUpdate(@Param("id") UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Organization> findForUpdateByMercadoPagoPreapprovalId(String mercadoPagoPreapprovalId);

    /**
     * Targeted write rather than save(org): MercadoPagoSubscriptionService holds no
     * transaction across its HTTP calls to MP, so a full-entity merge there could
     * overwrite concurrent edits to the org with stale values.
     */
    @Modifying
    @Transactional
    @Query("update Organization o set o.mercadoPagoPreapprovalId = :preapprovalId, o.mercadoPagoPreapprovalStatus = :status where o.id = :id")
    int updateMercadoPagoPreapproval(@Param("id") UUID id, @Param("preapprovalId") String preapprovalId, @Param("status") String status);

    @Modifying
    @Transactional
    @Query("update Organization o set o.mercadoPagoPayerEmail = :payerEmail where o.id = :id")
    int updateMercadoPagoPayerEmail(@Param("id") UUID id, @Param("payerEmail") String payerEmail);

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
