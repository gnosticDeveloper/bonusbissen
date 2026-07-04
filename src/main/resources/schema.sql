-- Points system MVP schema
-- Postgres 14+ (uses gen_random_uuid() from pgcrypto)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────────────────
-- employees: the only users who authenticate (cashiers/admins)
-- ─────────────────────────────────────────────────────────
CREATE TABLE employees (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username      VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name          VARCHAR(255) NOT NULL,
    role          VARCHAR(20)  NOT NULL CHECK (role IN ('admin', 'cashier')),
    active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────
-- customers: identified by DNI, no login
-- ─────────────────────────────────────────────────────────
CREATE TABLE customers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document    VARCHAR(20)  NOT NULL UNIQUE,   -- DNI
    phone       VARCHAR(20),
    name        VARCHAR(255) NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────
-- menu_items: points-per-item mapping only, no price.
-- Named apart from "products" so a future inventory/raw-materials
-- subsystem can own that word without a collision.
-- ─────────────────────────────────────────────────────────
CREATE TABLE menu_items (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(255) NOT NULL,
    points_value  INT          NOT NULL CHECK (points_value >= 0),
    active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────
-- menu_item_variants: optional variants of a menu item, e.g. a
-- milanesa "con papas" vs "sin papas". A variant can carry its own
-- points_value; a purchase with no variant just uses the base item's.
-- ─────────────────────────────────────────────────────────
CREATE TABLE menu_item_variants (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id  UUID         NOT NULL REFERENCES menu_items(id),
    name          VARCHAR(255) NOT NULL,
    points_value  INT          NOT NULL CHECK (points_value >= 0),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_menu_item_variants_name ON menu_item_variants(menu_item_id, lower(name));

-- ─────────────────────────────────────────────────────────
-- rewards: what points can be redeemed for
-- ─────────────────────────────────────────────────────────
CREATE TABLE rewards (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name             VARCHAR(255) NOT NULL,
    description      TEXT,
    cost_points      INT          NOT NULL CHECK (cost_points > 0),
    benefit_type     VARCHAR(20)  NOT NULL
                      CHECK (benefit_type IN ('free_item', 'discount_fixed', 'discount_percentage')),
    menu_item_id     UUID         REFERENCES menu_items(id),   -- nullable: null = not tied to one item
    discount_value   DECIMAL(12,2),                            -- amount or percentage, per benefit_type
    active           BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),

    -- discount_value required for discount types, must be null for free_item
    CONSTRAINT rewards_discount_value_check CHECK (
        (benefit_type = 'free_item' AND discount_value IS NULL)
        OR (benefit_type IN ('discount_fixed', 'discount_percentage') AND discount_value IS NOT NULL)
    ),
    -- free_item rewards must reference a menu item
    CONSTRAINT rewards_menu_item_required_for_free CHECK (
        (benefit_type != 'free_item') OR (menu_item_id IS NOT NULL)
    )
);

-- ─────────────────────────────────────────────────────────
-- point_transactions: the ledger. Source of truth for balances.
-- One row per menu item purchase, or one row per redemption.
-- ─────────────────────────────────────────────────────────
CREATE TABLE point_transactions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id   UUID        NOT NULL REFERENCES customers(id),
    employee_id   UUID        NOT NULL REFERENCES employees(id),
    type          VARCHAR(20) NOT NULL CHECK (type IN ('purchase', 'redemption')),
    menu_item_id         UUID REFERENCES menu_items(id),           -- set when type = purchase
    reward_id            UUID REFERENCES rewards(id),              -- set when type = redemption
    menu_item_variant_id UUID REFERENCES menu_item_variants(id),   -- set when the purchased menu item's variant was chosen
    points_delta  INT         NOT NULL,                    -- positive for purchase, negative for redemption
    note          TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT point_transactions_purchase_shape CHECK (
        (type = 'purchase'   AND menu_item_id IS NOT NULL AND reward_id IS NULL AND points_delta > 0)
        OR
        (type = 'redemption' AND reward_id    IS NOT NULL AND menu_item_id IS NULL AND points_delta < 0)
    )
);

-- ─────────────────────────────────────────────────────────
-- Indexes for the lookups this app actually does
-- ─────────────────────────────────────────────────────────
CREATE INDEX idx_point_transactions_customer_id ON point_transactions(customer_id);
CREATE INDEX idx_customers_document ON customers(document);
CREATE INDEX idx_menu_items_active ON menu_items(active) WHERE active = TRUE;
CREATE INDEX idx_rewards_active ON rewards(active) WHERE active = TRUE;
CREATE INDEX idx_menu_item_variants_menu_item_id ON menu_item_variants(menu_item_id);
CREATE INDEX idx_point_transactions_menu_item_variant_id ON point_transactions(menu_item_variant_id);
