-- Add assignee_id column to tasks table (references auth.users)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add auth_user_id to team_members table (to link invited members to actual users)
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_team_members_auth_user_id ON team_members(auth_user_id);

-- Function to auto-link team members when they sign up
CREATE OR REPLACE FUNCTION public.link_team_member_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Update team_members where email matches the new user's email
  UPDATE public.team_members
  SET auth_user_id = NEW.id
  WHERE email = NEW.email
    AND auth_user_id IS NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.link_team_member_on_signup();

-- RLS policy to allow users to see tasks assigned to them
CREATE POLICY "Users can view tasks assigned to them"
  ON tasks FOR SELECT
  USING (assignee_id = auth.uid() OR user_id = auth.uid());
