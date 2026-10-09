ALTER TABLE point_transactions ADD COLUMN corrected_transaction_id UUID REFERENCES point_transactions(id);
CREATE INDEX idx_point_transactions_corrected_transaction_id ON point_transactions(corrected_transaction_id);

ALTER TABLE point_transactions DROP CONSTRAINT point_transactions_transaction_type_check;
ALTER TABLE point_transactions ADD CONSTRAINT point_transactions_transaction_type_check
    CHECK (transaction_type IN ('earn', 'redeem', 'adjust'));
ALTER TABLE point_transactions DROP CONSTRAINT point_transactions_check;
ALTER TABLE point_transactions ADD CONSTRAINT point_transactions_check CHECK (
    (transaction_type = 'earn' AND points > 0 AND reward_id IS NULL AND state = 'delivered' AND corrected_transaction_id IS NULL)
    OR (transaction_type = 'redeem' AND points < 0 AND reward_id IS NOT NULL AND corrected_transaction_id IS NULL)
    OR (transaction_type = 'adjust' AND points <> 0 AND reward_id IS NULL AND state = 'delivered'
        AND employee_id IS NOT NULL AND refunded_transaction_id IS NULL
        AND (corrected_transaction_id IS NULL OR nullif(btrim(note), '') IS NOT NULL))
);
