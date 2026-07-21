-- Points system MVP schema
-- Postgres 14+ (uses gen_random_uuid() from pgcrypto)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- employees: the only users who authenticate (cashiers/admins)
CREATE TABLE IF NOT EXISTS employees (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username      VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name          VARCHAR(255) NOT NULL,
    role          VARCHAR(20)  NOT NULL CHECK (role IN ('admin', 'cashier')),
    active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- customers: identified by PHONE, no actual login.
CREATE TABLE IF NOT EXISTS customers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone       VARCHAR(20) NOT NULL UNIQUE,
    name        VARCHAR(255) NOT NULL,
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- rewards: what points can be redeemed for
CREATE TABLE IF NOT EXISTS rewards (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title            VARCHAR(255) NOT NULL,
    description      TEXT,
    cost_points      INT          NOT NULL CHECK (cost_points > 0),
    discount_value   DECIMAL(12,2), -- amount or percentage, if 100% discount, it is a free reward.
    active           BOOLEAN      NOT NULL DEFAULT TRUE,
    image_path       VARCHAR(255),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS point_transactions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id      UUID NOT NULL REFERENCES customers(id),
    reward_id        UUID REFERENCES rewards(id),
    employee_id      UUID REFERENCES employees(id), -- if null, it means the transaction is "pending". if not null, the transaction is either "completed" or "cancelled".
    transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('earn', 'redeem')),
    points           INT NOT NULL,  -- positive when adding points, negative when claiming rewards
    state            VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'delivered', 'cancelled')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
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
    point_transaction_id   UUID        NOT NULL REFERENCES point_transactions(id),
    customer_id   UUID        NOT NULL REFERENCES customers(id),
    code          VARCHAR(6)  NOT NULL,
    active        BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for the lookups this app actually does
CREATE INDEX IF NOT EXISTS idx_exchanges_customer_id ON point_transactions(customer_id) WHERE transaction_type = 'redeem';
CREATE INDEX IF NOT EXISTS idx_canjes_reward_id ON point_transactions(reward_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_customer_id ON point_transactions(customer_id) WHERE state = 'delivered' AND transaction_type = 'earn';
CREATE INDEX IF NOT EXISTS idx_rewards_active ON rewards(active) WHERE active = TRUE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_exchange_codes_point_transaction_id ON exchange_codes(point_transaction_id);
