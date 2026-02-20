-- Add assignee_id column to tasks table (references profiles/auth users)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);

-- Drop old foreign key if it exists (to team_members)
-- ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_assignee_id_fkey;
