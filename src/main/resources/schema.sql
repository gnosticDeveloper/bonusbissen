-- Points system MVP schema
-- Postgres 14+ (uses gen_random_uuid() from pgcrypto)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- organizations: one row per business using bonusbissen. Employees, rewards
-- and point transactions all belong to exactly one organization. Users
-- do NOT belong to an organization yet -- that link will be introduced later
-- through a subscription model.
CREATE TABLE IF NOT EXISTS organizations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(255) NOT NULL,
    icon_path     VARCHAR(255),
    hours         VARCHAR(255),
    address       VARCHAR(255),
    description   TEXT,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- employees: the only users who authenticate (cashiers/admins)
CREATE TABLE IF NOT EXISTS employees (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id  UUID NOT NULL REFERENCES organizations(id),
    username         VARCHAR(100) NOT NULL UNIQUE,
    password_hash    VARCHAR(255) NOT NULL,
    name             VARCHAR(255) NOT NULL,
    role             VARCHAR(20)  NOT NULL CHECK (role IN ('admin', 'cashier')),
    active           BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- users: self-service loyalty accounts. A user signs up and authenticates
-- with a username + password. Email is optional; once verified it can also
-- be used as a login identifier. Both username and email are unique. The
-- account belongs to bonusbissen, not to any single store.
CREATE TABLE IF NOT EXISTS users (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username       VARCHAR(100) NOT NULL UNIQUE,
    email          VARCHAR(255) UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    email_verified BOOLEAN      NOT NULL DEFAULT FALSE,
    name           VARCHAR(255) NOT NULL,
    active         BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- email_verification_tokens: one row per verification attempt. The address
-- being verified is stored on the token, so a link stays bound to the email
-- it was issued for even if the user edits their account afterwards.
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID         NOT NULL REFERENCES users(id),
    token        VARCHAR(64)  NOT NULL UNIQUE,
    email        VARCHAR(255) NOT NULL,
    expires_at   TIMESTAMPTZ  NOT NULL,
    consumed_at  TIMESTAMPTZ,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);

-- rewards: what points can be redeemed for. Each business manages its own catalog.
CREATE TABLE IF NOT EXISTS rewards (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id  UUID NOT NULL REFERENCES organizations(id),
    title            VARCHAR(255) NOT NULL,
    description      TEXT,
    cost_points      INT          NOT NULL CHECK (cost_points > 0),
    discount_value   DECIMAL(12,2), -- amount or percentage, if 100% discount, it is a free reward.
    active           BOOLEAN      NOT NULL DEFAULT TRUE,
    image_path       VARCHAR(255),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- No organization_id here on purpose: it's derivable through reward_id
-- (redeem) or employee_id (earn/grant) or, for refunds, through
-- refunded_transaction_id -> the original redeem's reward.
CREATE TABLE IF NOT EXISTS point_transactions (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID NOT NULL REFERENCES users(id),
    reward_id                UUID REFERENCES rewards(id),
    employee_id              UUID REFERENCES employees(id), -- if null, it means the transaction is "pending". if not null, the transaction is either "completed" or "cancelled".
    refunded_transaction_id  UUID REFERENCES point_transactions(id), -- set only on the refund 'earn' row created when a redeem is cancelled
    transaction_type         VARCHAR(10) NOT NULL CHECK (transaction_type IN ('earn', 'redeem')),
    points                   INT NOT NULL,  -- positive when adding points, negative when claiming rewards
    note                     TEXT, -- optional human context for a grant, e.g. "cumpleaños", "corrección de error"
    state                    VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'delivered', 'cancelled')),
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (
        (
            transaction_type = 'earn'
            AND points > 0
            AND reward_id IS NULL
            AND state = 'delivered'
        )
        OR
        (
            transaction_type = 'redeem'
            AND points < 0
            AND reward_id IS NOT NULL
        )
    )
);

CREATE TABLE IF NOT EXISTS exchange_codes (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID        NOT NULL REFERENCES organizations(id),
    point_transaction_id   UUID        NOT NULL REFERENCES point_transactions(id),
    user_id   UUID        NOT NULL REFERENCES users(id),
    code          VARCHAR(6)  NOT NULL,
    active        BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for the lookups this app actually does
CREATE INDEX IF NOT EXISTS idx_exchanges_user_id ON point_transactions(user_id) WHERE transaction_type = 'redeem';
CREATE INDEX IF NOT EXISTS idx_canjes_reward_id ON point_transactions(reward_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_user_id ON point_transactions(user_id) WHERE state = 'delivered' AND transaction_type = 'earn';
CREATE INDEX IF NOT EXISTS idx_point_transactions_refunded_transaction_id ON point_transactions(refunded_transaction_id);
CREATE INDEX IF NOT EXISTS idx_rewards_active ON rewards(active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_rewards_organization_id ON rewards(organization_id);
CREATE INDEX IF NOT EXISTS idx_employees_organization_id ON employees(organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_exchange_codes_point_transaction_id ON exchange_codes(point_transaction_id);
-- Codes only need to be unique within an organization: two different
-- businesses independently generating the same 6-character code is fine,
-- since verification/approval is always scoped by the acting employee's org.
CREATE UNIQUE INDEX IF NOT EXISTS idx_exchange_codes_org_code ON exchange_codes(organization_id, code);
