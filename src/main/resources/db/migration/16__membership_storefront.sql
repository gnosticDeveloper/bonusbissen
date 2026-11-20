-- Records the storefront a user joined a point program through, so a storefront
-- can list its affiliated users even though membership itself is per program.
-- Nullable: a self-service join by program id, or an admin with no active
-- storefront joining someone on their behalf, has no storefront to record.
ALTER TABLE user_point_programs ADD COLUMN IF NOT EXISTS storefront_id UUID REFERENCES storefronts(id);

-- Backfill: until now every program was served by a single storefront, so a
-- membership's storefront is the one attached to its program. If a program ever
-- had several, the oldest is used.
UPDATE user_point_programs upp
SET storefront_id = (
    SELECT s.id FROM storefronts s
    WHERE s.point_program_id = upp.point_program_id
    ORDER BY s.created_at, s.id
    LIMIT 1
)
WHERE upp.storefront_id IS NULL;

-- Redemptions used to carry no storefront, which left them out of per-storefront
-- figures; they now record the storefront that handed the reward over. Backfill the
-- delivered ones with their program's storefront (same single-storefront assumption).
-- Pending ones are tagged when approved, cancelled ones never count.
UPDATE point_transactions pt
SET storefront_id = (
    SELECT s.id FROM storefronts s
    WHERE s.point_program_id = pt.point_program_id
    ORDER BY s.created_at, s.id
    LIMIT 1
)
WHERE pt.transaction_type = 'redeem' AND pt.state = 'delivered' AND pt.storefront_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_point_programs_storefront_id ON user_point_programs(storefront_id);
