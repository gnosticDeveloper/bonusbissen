-- Third-party online businesses crediting points to BonusBissen users for their
-- own checkout (POST /webhooks/{provider}). One integration is bound to one
-- online storefront (whose point program receives the points) and one provider -- the way payment notifications reach us:
-- 'merchant' (the business's own server, HMAC-signed), later Mercado Pago, Pix
-- via the merchant's PSP, MODO, ... The money always lands in the merchant's own
-- account; we only receive notifications about it. credentials_encrypted is
-- opaque to everything but the provider's PaymentEventSource (for 'merchant' it
-- is the HMAC signing secret; for others an OAuth token, a PSP secret, ...),
-- kept encrypted (AES-GCM, key from the environment) since we need the raw
-- value. key_id is whatever public handle the provider uses to find the row.
-- points_per_unit is applied to the order amount on our side, so a merchant
-- can't choose how many points to give.
CREATE TABLE IF NOT EXISTS merchant_integrations (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id  UUID          NOT NULL REFERENCES organizations(id),
    storefront_id    UUID          NOT NULL REFERENCES storefronts(id),
    name             VARCHAR(100)  NOT NULL,
    provider         VARCHAR(30)   NOT NULL,
    key_id           VARCHAR(40)   NOT NULL UNIQUE,
    credentials_encrypted TEXT     NOT NULL,
    points_per_unit  NUMERIC(12,4) NOT NULL CHECK (points_per_unit > 0),
    currency         VARCHAR(3)    NOT NULL,
    active           BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_merchant_integrations_organization_id ON merchant_integrations(organization_id);

-- One row per credited order (order_id is the provider's own id for it). UNIQUE (integration_id, order_id) is what makes a
-- retried webhook a no-op instead of a double credit. transaction_id is null
-- when the amount was too small to earn a whole point.
CREATE TABLE IF NOT EXISTS online_purchases (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID          NOT NULL REFERENCES merchant_integrations(id),
    order_id       VARCHAR(128)  NOT NULL,
    user_id        UUID          NOT NULL REFERENCES users(id),
    amount         NUMERIC(14,2) NOT NULL,
    currency       VARCHAR(3)    NOT NULL,
    points         INT           NOT NULL,
    transaction_id UUID REFERENCES point_transactions(id),
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    UNIQUE (integration_id, order_id)
);
CREATE INDEX IF NOT EXISTS idx_online_purchases_user_id ON online_purchases(user_id);
