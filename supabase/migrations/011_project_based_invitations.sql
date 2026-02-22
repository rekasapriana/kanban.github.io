-- ============================================
-- Migration: Project-based Invitations
-- ============================================

-- Add project_id to team_invitations
ALTER TABLE team_invitations ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_team_invitations_project ON team_invitations(project_id);

-- Add invitation token for secure acceptance
ALTER TABLE team_invitations ADD COLUMN IF NOT EXISTS invitation_token TEXT UNIQUE;

-- Generate tokens for existing invitations (if any)
UPDATE team_invitations SET invitation_token = gen_random_uuid()::text WHERE invitation_token IS NULL;
