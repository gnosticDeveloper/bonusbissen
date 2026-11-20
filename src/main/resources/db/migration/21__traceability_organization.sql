-- The organization an audit row belongs to, written when the row is recorded (quality report
-- B15/D3). Until now it was re-derived on every read, one query per row after loading every row
-- of a type, and a session revocation stopped showing in its organization's audit as soon as the
-- person who made it left the staff (membership was decided by "is staff today"). NULL means no
-- organization: self-registration, and a user's own account changes.
ALTER TABLE traceability_logs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Backfill with the rules the code applied on every read. Each statement only touches rows still
-- NULL, so re-running the migration's logic is harmless.

-- The payload names the organization directly.
UPDATE traceability_logs l
SET organization_id = o.id
FROM organizations o
WHERE l.organization_id IS NULL
  AND l.operation_type IN ('staff_create', 'staff_role_update')
  AND o.id = (l.payload ->> 'organizationId')::uuid;

-- The payload names the point program, which belongs to one organization.
UPDATE traceability_logs l
SET organization_id = p.organization_id
FROM point_programs p
WHERE l.organization_id IS NULL
  AND l.operation_type IN ('points_grant', 'reward_claim')
  AND p.id = (l.payload ->> 'programId')::uuid;

-- The payload names the point transaction, whose program belongs to one organization.
UPDATE traceability_logs l
SET organization_id = p.organization_id
FROM point_transactions t
JOIN point_programs p ON p.id = t.point_program_id
WHERE l.organization_id IS NULL
  AND l.operation_type IN ('points_correction', 'exchange_verify', 'exchange_approve', 'exchange_cancel', 'exchange_user_cancel')
  AND t.id = (l.payload ->> 'transactionId')::uuid;

-- Session revocations carry no organization of their own: best effort from the person who made
-- them, if they are still active staff. Older rows of people who have since left stay NULL.
UPDATE traceability_logs l
SET organization_id = s.organization_id
FROM organization_staff s
WHERE l.organization_id IS NULL
  AND l.operation_type = 'session_revoke'
  AND s.user_id = l.originating_user_id
  AND s.active;

-- The audit read is "this organization's rows, newest first".
CREATE INDEX IF NOT EXISTS idx_traceability_logs_organization_created_at
    ON traceability_logs (organization_id, created_at DESC);
