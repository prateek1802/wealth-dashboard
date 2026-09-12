-- Run this once in Supabase SQL Editor, AFTER applying patch 006. Adds the
-- 'source' column to the EXISTING price_history table — every current row
-- becomes 'manual' by default (correct: they were all real, organically
-- recorded points, exactly what 'manual' means here). Safe to run even
-- with existing price_history data.

alter table price_history add column source text not null default 'manual' check (source in ('manual', 'backfill'));

notify pgrst, 'reload schema';
