-- Lots are the positive rows of a (user, program) pair: earn rows, plus the positive adjust rows a
-- correction adds on top of a grant. Two things the FIFO cursor (point_ledger_cursors) could not
-- express before, which let points escape expiration (quality report B5/B6):

-- 1. A negative correction takes points off the lot it corrects, not off whatever lot the cursor
--    is at. The lot row keeps its original points (the ledger stays append-only; the adjust row is
--    the audit trail) and records how much was taken off it here; its usable size is
--    points - reduced_points.
ALTER TABLE point_transactions ADD COLUMN reduced_points INT NOT NULL DEFAULT 0
    CHECK (reduced_points >= 0);

-- 2. Which lots each redemption spent, and how much of each, so cancelling it gives the points
--    back with the expiry dates they had instead of a fresh one.
CREATE TABLE IF NOT EXISTS point_lot_consumptions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consumer_transaction_id UUID NOT NULL REFERENCES point_transactions(id),
    lot_transaction_id      UUID NOT NULL REFERENCES point_transactions(id),
    points                  INT  NOT NULL CHECK (points > 0)
);
CREATE INDEX IF NOT EXISTS idx_point_lot_consumptions_consumer
    ON point_lot_consumptions (consumer_transaction_id);

-- The expiration job now scans every lot (points > 0), not only earn rows, so positive
-- corrections expire with the grant they belong to.
DROP INDEX IF EXISTS idx_point_transactions_pending_expiry;
CREATE INDEX IF NOT EXISTS idx_point_transactions_pending_expiry
    ON point_transactions (expires_at)
    WHERE points > 0 AND expiry_settled_at IS NULL;
