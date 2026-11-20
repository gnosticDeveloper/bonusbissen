-- Mercado Pago Subscriptions integration: "subscription, no associated plan,
-- pending payment" flow -- a preapproval ("suscripción") is created directly
-- from an org's billing plan price/currency, no preapproval_plan and no
-- card_token_id involved, so the payer picks their own payment method at
-- MP's hosted checkout. See MercadoPagoClient for why the plan-associated
-- flow (which requires a card_token_id collected via our own card form) was
-- tried first and dropped.
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS mercado_pago_preapproval_id VARCHAR(255);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS mercado_pago_preapproval_status VARCHAR(32);
-- Email of the Mercado Pago account that pays the subscription (payer_email on the
-- preapproval). Kept apart from billing_email, which is only where invoices are mailed.
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS mercado_pago_payer_email VARCHAR(255);

-- mercado_pago_payments: one row per approved Mercado Pago authorized payment
-- (a recurring charge on an org's preapproval). Two jobs:
--
-- 1. Idempotency -- MP delivers the same notification more than once; the
--    primary key on MP's own id makes every repeat a no-op instead of
--    marking the *next* pending invoice paid.
-- 2. Holding payments that arrive before their invoice -- MP charges on its
--    own schedule, InvoiceGenerationService on next_invoice_due_at's daily
--    cron. A payment with no pending invoice to apply to is kept here with
--    invoice_id NULL and applied when the invoice is generated.
CREATE TABLE IF NOT EXISTS mercado_pago_payments (
    authorized_payment_id VARCHAR(255) PRIMARY KEY,
    organization_id       UUID NOT NULL REFERENCES organizations(id),
    amount                NUMERIC(12,2),
    currency              VARCHAR(3),
    invoice_id            UUID UNIQUE REFERENCES invoices(id),
    received_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mercado_pago_payments_unapplied
    ON mercado_pago_payments (organization_id, received_at) WHERE invoice_id IS NULL;

-- One invoice per payment reference, enforced at the DB level too.
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_payment_reference ON invoices (payment_reference);

-- invoice_number: the human-facing, sequential number printed on the document
-- and used in its filename, distinct from the UUID primary key (which stays
-- the API identifier). One global sequence, not per organization -- the
-- number is bonusbissen's own, and a single series is easy to audit. A
-- sequence is not gapless: a rolled-back invoice insert burns its number.
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_number BIGINT;
-- Backfill any pre-existing invoices in creation order.
UPDATE invoices i SET invoice_number = n.num
FROM (
    SELECT id, nextval('invoice_number_seq') AS num
    FROM (SELECT id FROM invoices WHERE invoice_number IS NULL ORDER BY created_at, id) ordered
) n
WHERE i.id = n.id;
ALTER TABLE invoices ALTER COLUMN invoice_number SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_invoice_number ON invoices (invoice_number);
