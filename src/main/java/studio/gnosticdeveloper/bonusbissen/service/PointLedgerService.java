package studio.gnosticdeveloper.bonusbissen.service;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import studio.gnosticdeveloper.bonusbissen.entity.PointLedgerCursor;
import studio.gnosticdeveloper.bonusbissen.entity.PointTransaction;
import studio.gnosticdeveloper.bonusbissen.repository.PointLedgerCursorRepository;
import studio.gnosticdeveloper.bonusbissen.repository.PointProgramRepository;
import studio.gnosticdeveloper.bonusbissen.repository.PointTransactionRepository;
import studio.gnosticdeveloper.bonusbissen.repository.UserRepository;

/**
 * Tracks how much of each (user, program) pair's earn lots are still unspent, via a single
 * per-pair cursor (see {@link PointLedgerCursor}) instead of replaying the whole transaction
 * history. Consumption only ever walks forward, so "resume from the cursor" is always correct.
 */
@Service
public class PointLedgerService {

    private final PointTransactionRepository pointTransactionRepository;
    private final PointLedgerCursorRepository pointLedgerCursorRepository;
    private final UserRepository userRepository;
    private final PointProgramRepository pointProgramRepository;

    public PointLedgerService(
        PointTransactionRepository pointTransactionRepository,
        PointLedgerCursorRepository pointLedgerCursorRepository,
        UserRepository userRepository,
        PointProgramRepository pointProgramRepository
    ) {
        this.pointTransactionRepository = pointTransactionRepository;
        this.pointLedgerCursorRepository = pointLedgerCursorRepository;
        this.userRepository = userRepository;
        this.pointProgramRepository = pointProgramRepository;
    }

    /**
     * FIFO-depletes this pair's open lots by {@code amount}, advancing the cursor forward as
     * needed. The caller MUST already hold this pair's {@link BalanceLockService} advisory lock
     * (same precondition requireAffordableAdjustment relies on) -- without it, two concurrent
     * consumptions could both read the same pre-consumption cursor position and double-spend the
     * same lot's capacity.
     */
    @Transactional
    public void consumeFifo(UUID userId, UUID programId, int amount) {
        PointLedgerCursor cursor = getOrCreateCursor(userId, programId);

        PointTransaction frontier = cursor.getLastTransaction();
        int remaining = frontier == null ? 0 : frontier.getPoints() - cursor.getOffsetPoints();
        int offset = cursor.getOffsetPoints();
        int toConsume = amount;

        while (toConsume > 0) {
            if (remaining == 0) {
                OffsetDateTime afterCreatedAt = frontier == null ? null : frontier.getCreatedAt();
                UUID afterId = frontier == null ? null : frontier.getId();
                Optional<PointTransaction> next = pointTransactionRepository.findNextOpenLot(userId, programId, afterCreatedAt, afterId);
                if (next.isEmpty()) {
                    break; // nothing left to attribute to -- matches existing allowDebt semantics
                }
                frontier = next.get();
                remaining = frontier.getPoints();
                offset = 0;
            }
            int take = Math.min(remaining, toConsume);
            remaining -= take;
            toConsume -= take;
            offset += take;
        }

        cursor.setLastTransaction(frontier); // only ever advances -- never written back to null once set
        cursor.setOffsetPoints(offset);
        pointLedgerCursorRepository.save(cursor);
    }

    /** How much of this specific lot is still unconsumed, purely from its position vs. the cursor. */
    public int remainingOf(PointTransaction lot, PointLedgerCursor cursor) {
        PointTransaction frontier = cursor.getLastTransaction();
        if (frontier == null) {
            return lot.getPoints();
        }
        int cmp = compareOrder(lot, frontier);
        if (cmp < 0) {
            return 0;
        }
        if (cmp == 0) {
            return lot.getPoints() - cursor.getOffsetPoints();
        }
        return lot.getPoints();
    }

    /** Called when the expiration job fully expires a lot that happens to be the cursor's current position. */
    @Transactional
    public void markLotFullyConsumed(PointTransaction lot, PointLedgerCursor cursor) {
        PointTransaction frontier = cursor.getLastTransaction();
        if (frontier != null && frontier.getId().equals(lot.getId())) {
            cursor.setOffsetPoints(lot.getPoints());
            pointLedgerCursorRepository.save(cursor);
        }
        // Otherwise the lot isn't the cursor's position (already behind it, or not yet reached) --
        // findNextOpenLot's NOT EXISTS check on expired_transaction_id handles both cases correctly.
    }

    @Transactional
    public PointLedgerCursor getOrCreateCursor(UUID userId, UUID programId) {
        return pointLedgerCursorRepository.findByUser_IdAndPointProgram_Id(userId, programId)
            .orElseGet(() -> {
                PointLedgerCursor cursor = new PointLedgerCursor();
                cursor.setUser(userRepository.getReferenceById(userId));
                cursor.setPointProgram(pointProgramRepository.getReferenceById(programId));
                cursor.setOffsetPoints(0);
                return pointLedgerCursorRepository.save(cursor);
            });
    }

    private static int compareOrder(PointTransaction a, PointTransaction b) {
        int byDate = a.getCreatedAt().compareTo(b.getCreatedAt());
        return byDate != 0 ? byDate : a.getId().compareTo(b.getId());
    }
}
