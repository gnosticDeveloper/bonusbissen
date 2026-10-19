-- Retain each assigned calendar date, adding the original lot's UTC time of day.
-- Do not recompute historical deadlines from the program's current expiration policy.
ALTER TABLE point_transactions
    ALTER COLUMN expires_at TYPE TIMESTAMPTZ
    USING ((expires_at + (created_at AT TIME ZONE 'UTC')::time) AT TIME ZONE 'UTC');
