-- What Mercado Pago actually charged for an invoice, and whether it fell short (quality report
-- B12). A charge can still be at the old price when a plan change lands mid-debit; the invoice is
-- marked paid anyway, so the organization isn't locked out over that timing, but the shortfall
-- is kept here for reconciliation instead of only in a log line. NULL paid_amount: paid before
-- this migration, or not paid yet.
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12,2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_currency VARCHAR(3);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS needs_reconciliation BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_invoices_needs_reconciliation
    ON invoices (organization_id)
    WHERE needs_reconciliation;
