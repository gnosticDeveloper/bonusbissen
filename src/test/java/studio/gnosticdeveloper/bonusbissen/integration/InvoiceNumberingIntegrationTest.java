package studio.gnosticdeveloper.bonusbissen.integration;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import studio.gnosticdeveloper.bonusbissen.entity.BillingCycle;
import studio.gnosticdeveloper.bonusbissen.entity.BillingPlan;
import studio.gnosticdeveloper.bonusbissen.entity.Invoice;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.repository.BillingPlanRepository;
import studio.gnosticdeveloper.bonusbissen.service.InvoiceService;

/** Invoice numbers come from one global DB sequence, so they must be unique and increasing across orgs and threads. */
class InvoiceNumberingIntegrationTest extends AbstractIntegrationTest {

    @Autowired private BillingPlanRepository billingPlanRepository;
    @Autowired private InvoiceService invoiceService;

    private Organization createDueOrg(BillingPlan plan) {
        Organization org = new Organization();
        org.setName("Numbering Org " + UUID.randomUUID());
        org.setBillingPlan(plan);
        org.setBillingCycle(BillingCycle.MONTHLY);
        org.setNextInvoiceDueAt(OffsetDateTime.now().minusHours(1));
        return organizationRepository.save(org);
    }

    private BillingPlan plan() {
        BillingPlan plan = new BillingPlan();
        plan.setName("Plan " + UUID.randomUUID());
        plan.setPrice(new BigDecimal("5000.00"));
        plan.setCurrency("ARS");
        return billingPlanRepository.save(plan);
    }

    @Test
    void invoicesAcrossOrganizationsGetStrictlyIncreasingNumbers() {
        BillingPlan plan = plan();
        Invoice a = invoiceService.generateForOrganization(createDueOrg(plan).getId(), OffsetDateTime.now());
        Invoice b = invoiceService.generateForOrganization(createDueOrg(plan).getId(), OffsetDateTime.now());

        assertThat(b.getInvoiceNumber()).isGreaterThan(a.getInvoiceNumber());
    }

    @Test
    void concurrentGenerationNeverHandsOutTheSameNumberTwice() {
        BillingPlan plan = plan();
        List<UUID> orgIds = new ArrayList<>();
        for (int i = 0; i < 12; i++) {
            orgIds.add(createDueOrg(plan).getId());
        }

        ExecutorService pool = Executors.newFixedThreadPool(12);
        try {
            List<CompletableFuture<Long>> futures = orgIds.stream()
                .map(id -> CompletableFuture.supplyAsync(
                    () -> invoiceService.generateForOrganization(id, OffsetDateTime.now()).getInvoiceNumber(), pool))
                .toList();
            List<Long> numbers = futures.stream().map(CompletableFuture::join).toList();

            assertThat(numbers).doesNotHaveDuplicates();
        } finally {
            pool.shutdownNow();
        }
    }
}
