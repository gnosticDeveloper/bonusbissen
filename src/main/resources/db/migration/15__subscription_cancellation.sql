-- Cancelling an active Mercado Pago subscription doesn't cut access on the
-- spot: the org keeps what it already paid for. subscription_ends_at is the
-- end of that paid period (next_invoice_due_at at the moment of cancelling).
-- While it is set, no further invoices are generated; once it has passed, the
-- org is locked the same way an overdue one is (see SubscriptionGuard), with
-- no grace period on top since leaving was the org's own choice.
-- Cleared when a new Mercado Pago subscription is authorized.
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;

-- Short-lived per-organization lease taken around a Mercado Pago checkout or
-- cancel (MercadoPagoSubscriptionService). Those span several HTTP calls to MP
-- with deliberately no DB transaction around them, so nothing else would stop
-- two of them for one org from interleaving and leaving two live preapprovals
-- that could both charge. A row means "an operation is in flight"; it is
-- deleted when the operation finishes, and a row older than the service's TTL
-- is treated as abandoned (the process died mid-operation) and can be taken
-- over. holder is a random token per acquisition, so releasing never deletes a
-- lease someone else took over.
CREATE TABLE IF NOT EXISTS subscription_operation_locks (
    organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    holder          UUID        NOT NULL,
    acquired_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
