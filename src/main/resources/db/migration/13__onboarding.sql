-- Onboarding progress for a user setting up their business: create the
-- organization, pay, create a storefront, create a point program. One row per
-- user; each step is a nullable timestamp, so "current step" is the first null
-- and there is no separate status column to drift out of sync.
-- organization_id is NULL until the first step is done, and UNIQUE because an
-- org is onboarded by exactly one user (its creator).
CREATE TABLE IF NOT EXISTS onboarding (
    user_id                   UUID PRIMARY KEY REFERENCES users(id),
    organization_id           UUID UNIQUE REFERENCES organizations(id),
    organization_created_at   TIMESTAMPTZ,
    paid_at                   TIMESTAMPTZ,
    storefront_created_at     TIMESTAMPTZ,
    point_program_created_at  TIMESTAMPTZ,
    completed_at              TIMESTAMPTZ,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Orgs that existed before onboarding tracking are already set up: record their
-- admins as completed so they aren't dropped into the wizard.
INSERT INTO onboarding (user_id, organization_id, organization_created_at, paid_at, storefront_created_at, point_program_created_at, completed_at)
SELECT DISTINCT ON (s.organization_id) s.user_id, s.organization_id, now(), now(), now(), now(), now()
FROM organization_staff s
WHERE s.role = 'admin' AND s.active = true
ORDER BY s.organization_id, s.created_at
ON CONFLICT DO NOTHING;
