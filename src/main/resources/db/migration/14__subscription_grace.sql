-- Subscription enforcement: an organization whose invoice stays unpaid past
-- its grace period can no longer award points and drops out of discovery
-- (see SubscriptionGuard). The grace period lives here rather than in config
-- so it can differ per organization: each org points at a tier by name, and
-- a tier's days are edited directly against this table (no endpoint, same
-- as billing_plans).
CREATE TABLE IF NOT EXISTS grace_tiers (
    name       VARCHAR(32) PRIMARY KEY,
    grace_days INTEGER     NOT NULL CHECK (grace_days >= 0)
);

INSERT INTO grace_tiers (name, grace_days) VALUES ('regular', 7), ('pilot', 30)
ON CONFLICT (name) DO NOTHING;

-- Every existing organization lands on 'pilot'. Existing orgs have no
-- billing plan, hence no invoices, hence can never be lapsed -- access is
-- preserved until one is deliberately put on a plan.
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS grace_tier VARCHAR(32) NOT NULL DEFAULT 'pilot' REFERENCES grace_tiers(name);

-- Backs the "has an overdue unpaid invoice" lookup done on every point grant and discover query.
CREATE INDEX IF NOT EXISTS idx_invoices_org_pending ON invoices (organization_id) WHERE payment_status = 'pending';
