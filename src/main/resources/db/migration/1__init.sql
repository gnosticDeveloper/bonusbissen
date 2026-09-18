-- Points system MVP schema
-- Postgres 14+ (uses gen_random_uuid() from pgcrypto)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- organizations: one row per business (tenant/account) using bonusbissen.
-- Customer-facing details (address, hours, icon, description) live on
-- storefronts, not here -- a business can have several. Employees, point
-- programs and storefronts all belong to exactly one organization. Users do
-- NOT belong to an organization yet -- that link will be introduced later
-- through a subscription model.
CREATE TABLE IF NOT EXISTS organizations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(255) NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- storefronts: a single point of contact with customers -- a physical branch
-- or an online shop. `online = true` means there is no street address; a
-- physical storefront must carry one (the CHECK below). `city` is derived via
-- georef-ar on create/update (no separate cities table).
CREATE TABLE IF NOT EXISTS storefronts (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id  UUID NOT NULL REFERENCES organizations(id),
    name             VARCHAR(255) NOT NULL,
    online           BOOLEAN      NOT NULL DEFAULT FALSE,
    address          VARCHAR(255),
    city             VARCHAR(120),
    category         VARCHAR(80),
    color            VARCHAR(9),
    hours            VARCHAR(255),
    icon_path        VARCHAR(255),
    description      TEXT,
    active           BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CHECK (online OR address IS NOT NULL)
);

-- point_programs: a named pool of points ("Puntos Café", "Club Online").
-- A program belongs to one organization and is honoured at one or more of
-- its storefronts (point_program_storefronts). A user's balance is computed
-- per (user, program): SUM(points) WHERE user_id = ? AND point_program_id = ?.
CREATE TABLE IF NOT EXISTS point_programs (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id  UUID NOT NULL REFERENCES organizations(id),
    name             VARCHAR(255) NOT NULL,
    unit_label       VARCHAR(50), -- what one point is called, e.g. "granos"; null -> client default ("puntos")
    active           BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (organization_id, name)
);

-- Which storefronts honour which program. Two storefronts on one program
-- share a single pool; a storefront on no program does not run points at all.
CREATE TABLE IF NOT EXISTS point_program_storefronts (
    point_program_id  UUID NOT NULL REFERENCES point_programs(id),
    storefront_id     UUID NOT NULL REFERENCES storefronts(id),
    PRIMARY KEY (point_program_id, storefront_id)
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

-- user_point_programs: a user's membership in a point program (issue #20).
-- A user must join a program (self-service, or an employee joining them on
-- the user's behalf) before points can be earned in it -- see the CHECK-less
-- gate enforced in PointTransactionService/UserService.grantPoints.
CREATE TABLE IF NOT EXISTS user_point_programs (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id),
    point_program_id  UUID NOT NULL REFERENCES point_programs(id),
    joined_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, point_program_id)
);

CREATE INDEX IF NOT EXISTS idx_user_point_programs_user_id ON user_point_programs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_point_programs_point_program_id ON user_point_programs(point_program_id);

-- organization_staff: is this user currently staff somewhere, and with what
-- role. Not a second account -- credentials live on `users`. At most one row
-- per user may be active at a time (enforced below).
CREATE TABLE IF NOT EXISTS organization_staff (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users(id),
    organization_id  UUID NOT NULL REFERENCES organizations(id),
    role             VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'cashier')),
    active           BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_organization_staff_active_user
    ON organization_staff(user_id) WHERE active = true;

CREATE TABLE IF NOT EXISTS staff_storefronts (
    staff_id       UUID NOT NULL REFERENCES organization_staff(id),
    storefront_id  UUID NOT NULL REFERENCES storefronts(id),
    PRIMARY KEY (staff_id, storefront_id)
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

-- rewards: what points can be redeemed for. Each reward belongs to one point
-- program; the owning organization is reachable through that program.
CREATE TABLE IF NOT EXISTS rewards (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    point_program_id UUID NOT NULL REFERENCES point_programs(id),
    title            VARCHAR(255) NOT NULL,
    description      TEXT,
    cost_points      INT          NOT NULL CHECK (cost_points > 0),
    discount_value   DECIMAL(12,2), -- amount or percentage, if 100% discount, it is a free reward.
    active           BOOLEAN      NOT NULL DEFAULT TRUE,
    image_path       VARCHAR(255),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- point_program_id is the pool this movement affects; the balance query keys
-- on it. storefront_id records where it happened (the acting cashier's active
-- storefront) for per-storefront analytics even when a pool is shared; it is
-- null for user-initiated redeem claims until an employee resolves them.
-- The owning organization is derivable through point_program_id.
CREATE TABLE IF NOT EXISTS point_transactions (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                  UUID NOT NULL REFERENCES users(id),
    point_program_id         UUID NOT NULL REFERENCES point_programs(id),
    storefront_id            UUID REFERENCES storefronts(id),
    reward_id                UUID REFERENCES rewards(id),
    employee_id              UUID REFERENCES organization_staff(id), -- the staff membership that acted; if null, the transaction is "pending". if not null, it's "completed" or "cancelled".
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
CREATE INDEX IF NOT EXISTS idx_point_transactions_point_program_id ON point_transactions(point_program_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_storefront_id ON point_transactions(storefront_id);
CREATE INDEX IF NOT EXISTS idx_rewards_active ON rewards(active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_rewards_point_program_id ON rewards(point_program_id);
CREATE INDEX IF NOT EXISTS idx_organization_staff_organization_id ON organization_staff(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_staff_user_id ON organization_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_storefronts_organization_id ON storefronts(organization_id);
CREATE INDEX IF NOT EXISTS idx_storefronts_city ON storefronts(city) WHERE city IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_point_programs_organization_id ON point_programs(organization_id);
CREATE INDEX IF NOT EXISTS idx_pps_storefront_id ON point_program_storefronts(storefront_id);
CREATE INDEX IF NOT EXISTS idx_staff_storefronts_storefront_id ON staff_storefronts(storefront_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_exchange_codes_point_transaction_id ON exchange_codes(point_transaction_id);
-- Codes only need to be unique within an organization: two different
-- businesses independently generating the same 6-character code is fine,
-- since verification/approval is always scoped by the acting employee's org.
CREATE UNIQUE INDEX IF NOT EXISTS idx_exchange_codes_org_code ON exchange_codes(organization_id, code);
