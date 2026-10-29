-- Soft delete for organizations: DELETE /organization flips this to FALSE
-- (and deactivates the org's staff, storefronts and point programs) instead
-- of removing rows, so transaction history stays intact.
ALTER TABLE organizations ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;
