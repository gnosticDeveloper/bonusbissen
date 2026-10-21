package studio.gnosticdeveloper.bonusbissen.service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import studio.gnosticdeveloper.bonusbissen.entity.PointLedgerCursor;
import studio.gnosticdeveloper.bonusbissen.entity.PointTransaction;
import studio.gnosticdeveloper.bonusbissen.entity.TransactionState;
import studio.gnosticdeveloper.bonusbissen.entity.TransactionType;
import studio.gnosticdeveloper.bonusbissen.repository.PointTransactionRepository;

/**
 * Expires one (user, program) pair's due earn lots, in its own transaction.
 *
 * This is a separate bean from {@link PointExpirationService}, not just for tidiness: the
 * advisory lock {@link BalanceLockService#lock} takes is transaction-scoped
 * (pg_advisory_xact_lock), released on commit. If the caller invoked processPair on itself
 * (plain `this` call from within the same class), Spring's proxy-based @Transactional
 * wouldn't intercept it, so there'd be no real surrounding transaction -- each statement would
 * commit on its own, releasing the lock right after it's acquired and giving zero protection for
 * the lots this touches. Calling into a different bean goes through the proxy, so @Transactional
 * here is real.
 *
 * How much of a due lot is still unspent is a cheap read against {@link PointLedgerCursor} --
 * see {@link PointLedgerService#remainingOf} -- not a replay of the pair's whole history.
 */
@Service
public class PointExpirationWorker {

    private final PointTransactionRepository pointTransactionRepository;
    private final BalanceLockService balanceLockService;
    private final PointLedgerService pointLedgerService;

    public PointExpirationWorker(
        PointTransactionRepository pointTransactionRepository,
        BalanceLockService balanceLockService,
        PointLedgerService pointLedgerService
    ) {
        this.pointTransactionRepository = pointTransactionRepository;
        this.balanceLockService = balanceLockService;
        this.pointLedgerService = pointLedgerService;
    }

    @Transactional
    public void processPair(UUID userId, UUID programId) {
        balanceLockService.lock(userId, programId);

        List<PointTransaction> dueLots = pointTransactionRepository.findDueLots(userId, programId);
        if (dueLots.isEmpty()) {
            return;
        }

        PointLedgerCursor cursor = pointLedgerService.getOrCreateCursor(userId, programId);
        for (PointTransaction lot : dueLots) {
            int remaining = pointLedgerService.remainingOf(lot, cursor);
            if (remaining > 0) {
                PointTransaction expireTx = new PointTransaction();
                expireTx.setUser(lot.getUser());
                expireTx.setPointProgram(lot.getPointProgram());
                expireTx.setTransactionType(TransactionType.EXPIRE);
                expireTx.setPoints(-remaining);
                expireTx.setState(TransactionState.DELIVERED);
                expireTx.setExpiredTransaction(lot);
                expireTx.setNote("Expiración automática de puntos");
                pointTransactionRepository.save(expireTx);
                pointLedgerService.markLotFullyConsumed(lot, cursor);
            }
            lot.setExpirySettledAt(OffsetDateTime.now());
            pointTransactionRepository.save(lot);
        }
    }
}
