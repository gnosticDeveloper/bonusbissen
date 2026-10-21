package studio.gnosticdeveloper.bonusbissen.service;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import studio.gnosticdeveloper.bonusbissen.repository.PointTransactionRepository;

/**
 * Daily job that expires point lots (earn transactions) past their configured expiry date.
 *
 * Points have no stored balance -- it's SUM(points) over an immutable ledger (see
 * {@link PointTransactionRepository#calculateBalance}) -- so "how much of this lot is still
 * unspent" isn't a column anywhere. {@link PointExpirationWorker#processPair} replays a
 * (user, program) ledger chronologically, simulating a FIFO queue of earn lots consumed
 * oldest-first by redemptions/adjustments, to derive each lot's unconsumed remainder at the
 * moment it's due. If that remainder is nonzero, it writes one offsetting EXPIRE transaction --
 * the ledger stays append-only, same as every other balance-affecting operation in this codebase.
 *
 * processPair lives on a separate bean (not a private method here) so each call crosses a real
 * Spring proxy boundary and its @Transactional actually applies -- see the note on
 * {@link PointExpirationWorker} for why that matters.
 *
 * This loop processes one (user, program) pair per transaction and is the natural seam to later
 * replace with a message-queue worker: swap "loop over pairs" for "enqueue one message per due
 * pair" and move {@link PointExpirationWorker#processPair} into a separate consumer. The FIFO
 * replay itself wouldn't change.
 */
@Service
public class PointExpirationService {

    private static final Logger log = LoggerFactory.getLogger(PointExpirationService.class);

    private final PointTransactionRepository pointTransactionRepository;
    private final PointExpirationWorker worker;
    private final int batchSize;

    public PointExpirationService(
        PointTransactionRepository pointTransactionRepository,
        PointExpirationWorker worker,
        @Value("${app.points.expiration-batch-size}") int batchSize
    ) {
        this.pointTransactionRepository = pointTransactionRepository;
        this.worker = worker;
        this.batchSize = batchSize;
    }

    @Scheduled(cron = "${app.points.expiration-cron}")
    public void runScheduledExpiration() {
        try {
            int pairs = expireDuePairs();
            log.info("Processed {} (user, program) pair(s) for point expiration", pairs);
        } catch (Exception e) {
            log.error("Point expiration run failed", e);
        }
    }

    /** Pages through every (user, program) pair with a lot due for expiration, oldest-unsettled scan first. */
    public int expireDuePairs() {
        int processed = 0;
        List<PointTransactionRepository.DuePair> page;
        do {
            page = pointTransactionRepository.findPairsWithDueExpiration(PageRequest.of(0, batchSize));
            for (PointTransactionRepository.DuePair pair : page) {
                worker.processPair(pair.getUserId(), pair.getPointProgramId());
                processed++;
            }
            // Each processPair call settles the pairs it touches, so the next page naturally excludes them.
        } while (!page.isEmpty());
        return processed;
    }
}
