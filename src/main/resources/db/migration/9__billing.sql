-- billing_plans: flat subscription tiers an organization can be assigned to.
-- Rows are managed directly against the database for now, same as plan assignment below.
CREATE TABLE IF NOT EXISTS billing_plans (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255)  NOT NULL,
    price       NUMERIC(12,2) NOT NULL,
    currency    VARCHAR(3)    NOT NULL DEFAULT 'ARS',
    active      BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Fiscal/billing data an org supplies about itself (self-service, same trust
-- level as organizations.name). billing_plan_id/billing_cycle/next_invoice_due_at
-- are the actual subscription assignment -- a business decision bonusbissen
-- makes about the org, not something the org sets for itself -- so there is no
-- endpoint for them; they're set directly against the database, same as
-- invoices.payment_status below. billing_email has no verification step for
-- now (c.f. email_verification_tokens) -- deferred until there's reason to
-- distrust admin-entered addresses.
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS fiscal_name VARCHAR(255);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tax_id VARCHAR(32);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS fiscal_address VARCHAR(255);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS iva_condition VARCHAR(32);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_email VARCHAR(255);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_plan_id UUID REFERENCES billing_plans(id);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(16);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS next_invoice_due_at TIMESTAMPTZ;

-- invoices: one row per billed cycle. amount/line_items are a snapshot taken
-- at generation time -- a plan's price changing later never alters a past
-- invoice. No PDF is stored; the Spanish-language document is regenerated on
-- demand from this snapshot whenever it's downloaded.
--
-- payment_status only ever moves to PAID by a direct UPDATE against this
-- table -- there is no endpoint for it. An admin "mark as paid" endpoint
-- would be exactly as unverified as a raw UPDATE (self-reported, no real
-- confirmation either way), so it isn't worth building until a Mercado Pago
-- integration can flip it from an actual payment signal instead.
-- payment_reference is the slot that future webhook would fill in.
CREATE TABLE IF NOT EXISTS invoices (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id   UUID NOT NULL REFERENCES organizations(id),
    billing_cycle     VARCHAR(16)   NOT NULL,
    due_at            TIMESTAMPTZ   NOT NULL,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    amount            NUMERIC(12,2) NOT NULL,
    currency          VARCHAR(3)    NOT NULL,
    line_items        JSONB         NOT NULL,
    payment_status    VARCHAR(16)   NOT NULL DEFAULT 'PENDING',
    paid_at           TIMESTAMPTZ,
    payment_reference VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_invoices_organization_id ON invoices (organization_id);
