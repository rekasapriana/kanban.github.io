-- Add project_members table for project access control
-- This allows invited users to access projects they were invited to

CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  invited_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);

-- Enable RLS
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view project_members for projects they own or are members of
CREATE POLICY "Users can view project members for accessible projects"
  ON project_members FOR SELECT
  USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    OR project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

-- RLS Policy: Project owners can insert members
CREATE POLICY "Project owners can add members"
  ON project_members FOR INSERT
  WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- RLS Policy: Project owners can update members
CREATE POLICY "Project owners can update members"
  ON project_members FOR UPDATE
  USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- RLS Policy: Project owners can delete members
CREATE POLICY "Project owners can remove members"
  ON project_members FOR DELETE
  USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    OR user_id = auth.uid()  -- Users can remove themselves
  );

-- Also add the project owner as a member automatically when a new project is created
CREATE OR REPLACE FUNCTION add_project_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO project_members (project_id, user_id, role)
  VALUES (NEW.id, NEW.user_id, 'admin')
  ON CONFLICT (project_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_add_project_owner_member
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION add_project_owner_as_member();

-- Add existing project owners as members
INSERT INTO project_members (project_id, user_id, role)
SELECT id, user_id, 'admin'
FROM projects
WHERE NOT EXISTS (
  SELECT 1 FROM project_members pm WHERE pm.project_id = projects.id AND pm.user_id = projects.user_id
);

-- ==================== UPDATE PROJECTS RLS POLICY ====================
-- Drop old policy and create new one that allows project members to view projects

DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;

CREATE POLICY "Users can view accessible projects" ON public.projects
  FOR SELECT USING (
    auth.uid() = user_id  -- User owns the project
    OR EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = projects.id
      AND project_members.user_id = auth.uid()
    )  -- User is a member of the project
  );

-- Also update UPDATE policy to allow project admins/members
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;

CREATE POLICY "Users can update accessible projects" ON public.projects
  FOR UPDATE USING (
    auth.uid() = user_id  -- User owns the project
    OR EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = projects.id
      AND project_members.user_id = auth.uid()
      AND project_members.role IN ('admin', 'member')
    )  -- User is admin or member of the project
  );
