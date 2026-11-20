-- Exchange codes only need to be unique among the ones a cashier can still act on. The old index
-- covered every code ever issued, so each organization's ~2.6M-code space filled up with history
-- and claims started failing on collisions as it grew. Codes are switched off once their
-- redemption is delivered or cancelled, which hands the value back to the pool.
CREATE UNIQUE INDEX IF NOT EXISTS idx_exchange_codes_org_code_active
    ON exchange_codes (organization_id, code)
    WHERE active;

-- Verification still looks codes up regardless of state (so staff are told a code was already
-- delivered or cancelled rather than "not found"), so keep a plain index on the same columns.
DROP INDEX IF EXISTS idx_exchange_codes_org_code;
CREATE INDEX IF NOT EXISTS idx_exchange_codes_org_code
    ON exchange_codes (organization_id, code, created_at DESC);
