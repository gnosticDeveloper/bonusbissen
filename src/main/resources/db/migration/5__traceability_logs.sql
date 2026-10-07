-- traceability_logs: one row per logical operation (operation_id is the row's own
-- primary key), with traceability_log_affected_users holding its 1..N affected users.
-- Not every operation type is kept forever -- see TraceabilityRetentionService's
-- daily `created_at < cutoff AND operation_type NOT IN (...)` purge. The composite
-- index below (not two separate single-column ones) lets that whole WHERE clause
-- resolve in one index scan instead of a sequential scan as the table grows; the
-- ON DELETE CASCADE lets the same purge cleanly drop the affected-user rows too.
CREATE TABLE IF NOT EXISTS traceability_logs (
    operation_id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_type      VARCHAR(64) NOT NULL,
    originating_user_id UUID        NOT NULL REFERENCES users(id),
    payload             JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_traceability_logs_originating_user_id ON traceability_logs(originating_user_id);
CREATE INDEX IF NOT EXISTS idx_traceability_logs_created_at_operation_type ON traceability_logs(created_at, operation_type);

CREATE TABLE IF NOT EXISTS traceability_log_affected_users (
    operation_id     UUID NOT NULL REFERENCES traceability_logs(operation_id) ON DELETE CASCADE,
    affected_user_id UUID NOT NULL REFERENCES users(id),
    PRIMARY KEY (operation_id, affected_user_id)
);
CREATE INDEX IF NOT EXISTS idx_traceability_log_affected_users_affected_user_id ON traceability_log_affected_users(affected_user_id);
