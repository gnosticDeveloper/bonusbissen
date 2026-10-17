package studio.gnosticdeveloper.bonusbissen.service;

import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.PreparedStatementCallback;
import org.springframework.stereotype.Component;

/**
 * Balance is a SUM() over point_transactions, not a row we can SELECT ... FOR UPDATE, so
 * concurrent balance-affecting operations racing the same check-then-insert could all see the
 * same pre-operation balance and all pass. This serializes per (user, program) with a
 * transaction-scoped advisory lock instead -- released automatically on commit/rollback.
 */
@Component
public class BalanceLockService {

    private final JdbcTemplate jdbcTemplate;

    public BalanceLockService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /** Serializes balance-affecting reads/writes for one (user, program) pair for the rest of the current transaction. */
    public void lock(UUID userId, UUID programId) {
        long key = mix64(userId.getMostSignificantBits(), userId.getLeastSignificantBits())
            ^ mix64(programId.getMostSignificantBits(), programId.getLeastSignificantBits());
        jdbcTemplate.execute("SELECT pg_advisory_xact_lock(?)", (PreparedStatementCallback<Void>) ps -> {
            ps.setLong(1, key);
            ps.execute();
            return null;
        });
    }

    /**
     * MurmurHash3 finalizer: a full-avalanche 64-bit mix, used to fold each UUID's 128 bits into one
     * lock key. UUID.hashCode() alone only XORs the two halves down to 32 bits per ID, which is cheap
     * to collide across unrelated (user, program) pairs and would serialize their locks together.
     */
    private static long mix64(long hi, long lo) {
        long h = hi ^ lo;
        h ^= (h >>> 33);
        h *= 0xff51afd7ed558ccdL;
        h ^= (h >>> 33);
        h *= 0xc4ceb9fe1a85ec53L;
        h ^= (h >>> 33);
        return h;
    }
}
