package studio.gnosticdeveloper.bonusbissen.integration;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.repository.SubscriptionOperationLockRepository;

/** The lease table against a real Postgres: atomic acquisition, holder-scoped release, and takeover of an abandoned lease. */
class SubscriptionOperationLockIntegrationTest extends AbstractIntegrationTest {

    private static final double TTL = 120;

    @Autowired
    private SubscriptionOperationLockRepository locks;

    private UUID newOrg() {
        Organization org = new Organization();
        org.setName("Lock Org " + UUID.randomUUID());
        return organizationRepository.save(org).getId();
    }

    @Test
    void onlyOneOfManyConcurrentCallersGetsTheLease() throws Exception {
        UUID org = newOrg();
        int callers = 12;
        ExecutorService pool = Executors.newFixedThreadPool(callers);
        try {
            List<Callable<Integer>> tasks = IntStream.range(0, callers)
                .<Callable<Integer>>mapToObj(i -> () -> locks.tryAcquire(org, UUID.randomUUID(), TTL))
                .toList();
            int acquired = 0;
            for (Future<Integer> f : pool.invokeAll(tasks)) {
                acquired += f.get(30, TimeUnit.SECONDS);
            }
            assertThat(acquired).isEqualTo(1);
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void aHeldLeaseBlocksOthersUntilItsHolderReleasesIt() {
        UUID org = newOrg();
        UUID first = UUID.randomUUID();
        UUID second = UUID.randomUUID();

        assertThat(locks.tryAcquire(org, first, TTL)).isEqualTo(1);
        assertThat(locks.tryAcquire(org, second, TTL)).isZero();
        assertThat(locks.release(org, first)).isEqualTo(1);
        assertThat(locks.tryAcquire(org, second, TTL)).isEqualTo(1);
    }

    @Test
    void leasesAreIndependentPerOrganization() {
        UUID a = newOrg();
        UUID b = newOrg();

        assertThat(locks.tryAcquire(a, UUID.randomUUID(), TTL)).isEqualTo(1);
        assertThat(locks.tryAcquire(b, UUID.randomUUID(), TTL)).isEqualTo(1);
    }

    @Test
    void releasingSomeoneElsesLeaseDoesNothing() {
        UUID org = newOrg();
        UUID holder = UUID.randomUUID();
        locks.tryAcquire(org, holder, TTL);

        assertThat(locks.release(org, UUID.randomUUID())).isZero();
        assertThat(locks.tryAcquire(org, UUID.randomUUID(), TTL)).isZero();
    }

    @Test
    void anAbandonedLeaseCanBeTakenOverAndTheOldHolderCannotReleaseTheNewOne() throws Exception {
        UUID org = newOrg();
        UUID crashed = UUID.randomUUID();
        UUID successor = UUID.randomUUID();
        locks.tryAcquire(org, crashed, TTL);
        Thread.sleep(50);

        // a TTL the existing lease is already older than == it expired
        assertThat(locks.tryAcquire(org, successor, 0.01)).isEqualTo(1);
        assertThat(locks.release(org, crashed)).isZero();
        assertThat(locks.tryAcquire(org, UUID.randomUUID(), TTL)).isZero();
        assertThat(locks.release(org, successor)).isEqualTo(1);
    }

    @Test
    void aFreshLeaseIsNotTakenOver() {
        UUID org = newOrg();
        locks.tryAcquire(org, UUID.randomUUID(), TTL);

        assertThat(locks.tryAcquire(org, UUID.randomUUID(), TTL)).isZero();
    }
}
