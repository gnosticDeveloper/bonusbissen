package studio.gnosticdeveloper.bonusbissen.service;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import studio.gnosticdeveloper.bonusbissen.entity.PointLedgerCursor;
import studio.gnosticdeveloper.bonusbissen.entity.PointLotConsumption;
import studio.gnosticdeveloper.bonusbissen.entity.PointTransaction;
import studio.gnosticdeveloper.bonusbissen.entity.TransactionState;
import studio.gnosticdeveloper.bonusbissen.entity.TransactionType;
import studio.gnosticdeveloper.bonusbissen.repository.PointLedgerCursorRepository;
import studio.gnosticdeveloper.bonusbissen.repository.PointLotConsumptionRepository;
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
    private final PointLotConsumptionRepository pointLotConsumptionRepository;

    public PointLedgerService(
        PointTransactionRepository pointTransactionRepository,
        PointLedgerCursorRepository pointLedgerCursorRepository,
        UserRepository userRepository,
        PointProgramRepository pointProgramRepository,
        PointLotConsumptionRepository pointLotConsumptionRepository
    ) {
        this.pointTransactionRepository = pointTransactionRepository;
        this.pointLedgerCursorRepository = pointLedgerCursorRepository;
        this.userRepository = userRepository;
        this.pointProgramRepository = pointProgramRepository;
        this.pointLotConsumptionRepository = pointLotConsumptionRepository;
    }

    /** A part of one lot that a consumption used up. */
    public record LotTake(PointTransaction lot, int points) {}

    /**
     * FIFO-depletes this pair's open lots by {@code amount}, advancing the cursor forward as
     * needed, and returns what it took from each lot (callers that may need to give the points
     * back, i.e. redemptions, record it). The caller MUST already hold this pair's
     * {@link BalanceLockService} advisory lock (same precondition requireAffordableAdjustment
     * relies on) -- without it, two concurrent consumptions could both read the same
     * pre-consumption cursor position and double-spend the same lot's capacity.
     */
    @Transactional
    public List<LotTake> consumeFifo(UUID userId, UUID programId, int amount) {
        PointLedgerCursor cursor = getOrCreateCursor(userId, programId);

        PointTransaction frontier = cursor.getLastTransaction();
        int remaining = frontier == null ? 0 : Math.max(0, frontier.getLotPoints() - cursor.getOffsetPoints());
        int offset = cursor.getOffsetPoints();
        int toConsume = amount;
        List<LotTake> takes = new ArrayList<>();

        while (toConsume > 0) {
            if (remaining == 0) {
                OffsetDateTime afterCreatedAt = frontier == null ? null : frontier.getCreatedAt();
                UUID afterId = frontier == null ? null : frontier.getId();
                Optional<PointTransaction> next = pointTransactionRepository.findNextOpenLot(userId, programId, afterCreatedAt, afterId);
                if (next.isEmpty()) {
                    break; // nothing left to attribute to -- matches existing allowDebt semantics
                }
                frontier = next.get();
                remaining = frontier.getLotPoints();
                offset = 0;
            }
            int take = Math.min(remaining, toConsume);
            remaining -= take;
            toConsume -= take;
            offset += take;
            takes.add(new LotTake(frontier, take));
        }

        cursor.setLastTransaction(frontier); // only ever advances -- never written back to null once set
        cursor.setOffsetPoints(offset);
        pointLedgerCursorRepository.save(cursor);
        return takes;
    }

    /**
     * Takes {@code amount} points off one specific lot -- a negative correction of that grant --
     * instead of off whatever lot the cursor is at. Only the part of the lot consumption hasn't
     * reached can come off it; anything beyond that was already spent, so it is taken FIFO from
     * the following lots, exactly like any other deduction. Same lock precondition as
     * {@link #consumeFifo}. The cursor never moves backwards: shrinking the lot it currently sits
     * on just leaves less of it ahead.
     */
    @Transactional
    public void reduceLot(PointTransaction lot, int amount) {
        UUID userId = lot.getUser().getId();
        UUID programId = lot.getPointProgram().getId();
        PointLedgerCursor cursor = getOrCreateCursor(userId, programId);

        int fromLot = Math.min(amount, remainingOf(lot, cursor));
        if (fromLot > 0) {
            lot.setReducedPoints(lot.getReducedPoints() + fromLot);
            pointTransactionRepository.save(lot);
        }
        if (amount > fromLot) {
            consumeFifo(userId, programId, amount - fromLot);
        }
    }

    /**
     * Spends a saved redemption's points FIFO and records which lots they came from, so
     * {@link #refundRedemption} can give them back with their original expiry dates. Same lock
     * precondition as {@link #consumeFifo}.
     */
    @Transactional
    public void consumeForRedemption(PointTransaction redemption) {
        List<LotTake> takes = consumeFifo(redemption.getUser().getId(), redemption.getPointProgram().getId(), Math.abs(redemption.getPoints()));
        for (LotTake take : takes) {
            PointLotConsumption consumption = new PointLotConsumption();
            consumption.setConsumerTransaction(redemption);
            consumption.setLotTransaction(take.lot());
            consumption.setPoints(take.points());
            pointLotConsumptionRepository.save(consumption);
        }
    }

    /**
     * Gives a cancelled redemption's points back: one new lot per lot it spent from, each with
     * that lot's expiry date, so claiming and cancelling can't push points past the date they
     * were due to expire (quality report B5). A date already past simply expires on the next run,
     * as the points would have if they hadn't been spent. The new lots are created now, i.e. ahead
     * of the cursor, which never moves backwards; a lot ahead of it counts in full and may expire
     * before older ones (see {@link #remainingOf} and findNextOpenLot). Points with no recorded
     * source -- redemptions made before migration 19, or spent past the available lots -- come back
     * with the program's period from today, as they always did.
     */
    @Transactional
    public List<PointTransaction> refundRedemption(PointTransaction redemption) {
        int owed = Math.abs(redemption.getPoints());
        List<PointTransaction> refunds = new ArrayList<>();
        List<PointLotConsumption> parts = pointLotConsumptionRepository
            .findByConsumerTransaction_IdOrderByLotTransaction_CreatedAtAscLotTransaction_IdAsc(redemption.getId());
        for (PointLotConsumption part : parts) {
            refunds.add(saveRefundLot(redemption, part.getPoints(), part.getLotTransaction().getExpiresAt()));
            owed -= part.getPoints();
        }
        if (owed > 0) {
            refunds.add(saveRefundLot(redemption, owed, null));
        }
        return refunds;
    }

    /** A null {@code expiresAt} lets PointTransaction#onCreate date it from the program's period. */
    private PointTransaction saveRefundLot(PointTransaction redemption, int points, OffsetDateTime expiresAt) {
        PointTransaction refund = new PointTransaction();
        refund.setRefundedTransaction(redemption);
        refund.setUser(redemption.getUser());
        refund.setPointProgram(redemption.getPointProgram());
        refund.setStorefront(redemption.getStorefront());
        refund.setPoints(points);
        refund.setTransactionType(TransactionType.EARN);
        refund.setState(TransactionState.DELIVERED);
        refund.setExpiresAt(expiresAt);
        return pointTransactionRepository.save(refund);
    }

    /** How much of this specific lot is still unconsumed, purely from its position vs. the cursor. */
    public int remainingOf(PointTransaction lot, PointLedgerCursor cursor) {
        PointTransaction frontier = cursor.getLastTransaction();
        if (frontier == null) {
            return lot.getLotPoints();
        }
        int cmp = compareOrder(lot, frontier);
        if (cmp < 0) {
            return 0;
        }
        if (cmp == 0) {
            return Math.max(0, lot.getLotPoints() - cursor.getOffsetPoints());
        }
        return lot.getLotPoints();
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
