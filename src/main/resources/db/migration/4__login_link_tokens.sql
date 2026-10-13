-- login_link_tokens: one-time passwordless sign-in links. organization_id is
-- null for a customer login link and set for a dashboard staff login link
-- (scoped to that org, mirroring the DashboardLoginRequest guard).
CREATE TABLE IF NOT EXISTS login_link_tokens (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID         NOT NULL REFERENCES users(id),
    organization_id UUID         REFERENCES organizations(id),
    token           VARCHAR(64)  NOT NULL UNIQUE,
    email           VARCHAR(255) NOT NULL,
    expires_at      TIMESTAMPTZ  NOT NULL,
    consumed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_login_link_tokens_user_id ON login_link_tokens(user_id);
