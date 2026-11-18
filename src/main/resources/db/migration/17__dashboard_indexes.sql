-- Dashboard home ("Inicio") reads point_transactions by program and date: the last-30-day
-- figures, the previous 30 days they are compared against, and the top rankings all filter
-- on created_at. The program comes first because every org-scoped query reaches its rows
-- through point_programs (one organization has few programs), and created_at second so the
-- date filter becomes a range scan inside each program instead of reading its whole history.
CREATE INDEX IF NOT EXISTS idx_point_transactions_program_created_at
    ON point_transactions (point_program_id, created_at);

-- The pending-redemption queue (oldest first), its count, and the sidebar badge only ever
-- read state = 'pending'. That set stays small while the table grows, so a partial index
-- keeps those reads proportional to the open queue rather than to all history.
CREATE INDEX IF NOT EXISTS idx_point_transactions_pending_program_created_at
    ON point_transactions (point_program_id, created_at)
    WHERE state = 'pending';
