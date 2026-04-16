-- Add invite_code to teams table for shareable join codes
ALTER TABLE teams ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- Generate invite codes for existing teams
UPDATE teams
SET invite_code = upper(substring(md5(id::text || random()::text), 1, 6))
WHERE invite_code IS NULL;

-- Index for fast lookups by invite_code
CREATE INDEX IF NOT EXISTS idx_teams_invite_code ON teams(invite_code);
