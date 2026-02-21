-- Tabel untuk undangan team yang pending
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index untuk query cepat
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON team_invitations(status);

-- Enable RLS
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Team owner bisa lihat undangan mereka
CREATE POLICY "Team owners can view their invitations"
ON team_invitations FOR SELECT
TO authenticated
USING (team_owner_id = auth.uid());

-- Policy: User bisa lihat undangan untuk email mereka
CREATE POLICY "Users can view invitations to their email"
ON team_invitations FOR SELECT
TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Policy: Team owner bisa insert undangan
CREATE POLICY "Team owners can insert invitations"
ON team_invitations FOR INSERT
TO authenticated
WITH CHECK (team_owner_id = auth.uid());

-- Policy: User bisa update undangan mereka (accept/decline)
CREATE POLICY "Users can update their invitations"
ON team_invitations FOR UPDATE
TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Policy: Team owner bisa delete undangan
CREATE POLICY "Team owners can delete their invitations"
ON team_invitations FOR DELETE
TO authenticated
USING (team_owner_id = auth.uid());
