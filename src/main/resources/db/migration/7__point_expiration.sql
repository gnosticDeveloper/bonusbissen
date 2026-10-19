ALTER TABLE point_programs ADD COLUMN expiration_months INT NULL
    CHECK (expiration_months IS NULL OR expiration_months IN (3, 6, 9, 12));

ALTER TABLE point_transactions ADD COLUMN expires_at DATE NULL;
ALTER TABLE point_transactions ADD COLUMN expired_transaction_id UUID REFERENCES point_transactions(id);
ALTER TABLE point_transactions ADD COLUMN expiry_settled_at TIMESTAMPTZ NULL;
-- Set when a full-reversal correction (updateGrant with target total <= 0) zeroes out a lot by
-- hand -- excludes it from ever being re-dated by backfillExpiresAt, even if the program's
-- expiration gets disabled and re-enabled later.
ALTER TABLE point_transactions ADD COLUMN voided_at TIMESTAMPTZ NULL;

CREATE INDEX idx_point_transactions_expired_transaction_id ON point_transactions(expired_transaction_id);
-- Partial index: this is exactly the expiration cron's scan predicate, keeps it cheap as the table grows.
CREATE INDEX idx_point_transactions_pending_expiry ON point_transactions(expires_at)
    WHERE transaction_type = 'earn' AND expiry_settled_at IS NULL;

ALTER TABLE point_transactions DROP CONSTRAINT point_transactions_transaction_type_check;
ALTER TABLE point_transactions ADD CONSTRAINT point_transactions_transaction_type_check
    CHECK (transaction_type IN ('earn', 'redeem', 'adjust', 'expire'));

ALTER TABLE point_transactions DROP CONSTRAINT point_transactions_check;
ALTER TABLE point_transactions ADD CONSTRAINT point_transactions_check CHECK (
    (transaction_type = 'earn' AND points > 0 AND reward_id IS NULL AND state = 'delivered' AND corrected_transaction_id IS NULL)
    OR (transaction_type = 'redeem' AND points < 0 AND reward_id IS NOT NULL AND corrected_transaction_id IS NULL)
    OR (transaction_type = 'adjust' AND points <> 0 AND reward_id IS NULL AND state = 'delivered'
        AND employee_id IS NOT NULL AND refunded_transaction_id IS NULL
        AND (corrected_transaction_id IS NULL OR nullif(btrim(note), '') IS NOT NULL))
    OR (transaction_type = 'expire' AND points < 0 AND reward_id IS NULL AND state = 'delivered'
        AND employee_id IS NULL AND refunded_transaction_id IS NULL AND corrected_transaction_id IS NULL
        AND expired_transaction_id IS NOT NULL)
);

-- One row per (user, program) pair: where FIFO consumption last reached, and how far into that
-- lot. Every lot older than last_transaction_id (by created_at, tie-broken by id) is fully
-- consumed; every lot newer than it hasn't been touched yet. NULL means nothing's ever been
-- consumed for this pair. This is the only state consumption needs -- no per-lot remaining
-- column, no ledger replay.
CREATE TABLE point_ledger_cursors (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id),
    point_program_id    UUID NOT NULL REFERENCES point_programs(id),
    last_transaction_id UUID REFERENCES point_transactions(id),
    offset_points       INT NOT NULL DEFAULT 0 CHECK (offset_points >= 0),
    UNIQUE (user_id, point_program_id)
);
