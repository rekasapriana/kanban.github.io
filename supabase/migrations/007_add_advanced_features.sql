-- ============================================
-- Migration: Advanced Features
-- Includes: Time Tracking, Dependencies, Recurring Tasks, Templates, Board Members, Activity Log
-- ============================================

-- ==================== TIME TRACKING ====================

-- Task time entries table
CREATE TABLE IF NOT EXISTS task_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  started_at TIMESTAMPTZ,
  stopped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add timer columns to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS timer_started_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS timer_user_id UUID REFERENCES auth.users(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_time_entries_task_id ON task_time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON task_time_entries(user_id);

-- Enable RLS
ALTER TABLE task_time_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for time entries
CREATE POLICY "Users can view time entries on their tasks"
  ON task_time_entries FOR SELECT
  USING (
    task_id IN (SELECT id FROM tasks WHERE user_id = auth.uid())
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can insert their own time entries"
  ON task_time_entries FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own time entries"
  ON task_time_entries FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own time entries"
  ON task_time_entries FOR DELETE
  USING (user_id = auth.uid());

-- ==================== TASK DEPENDENCIES ====================

-- Task dependencies table
CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  dependency_type TEXT DEFAULT 'blocks' CHECK (dependency_type IN ('blocks', 'blocked_by')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, depends_on_task_id),
  CHECK (task_id != depends_on_task_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_dependencies_task_id ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_depends_on ON task_dependencies(depends_on_task_id);

-- Enable RLS
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dependencies
CREATE POLICY "Users can view dependencies on their tasks"
  ON task_dependencies FOR SELECT
  USING (
    task_id IN (SELECT id FROM tasks WHERE user_id = auth.uid())
    OR depends_on_task_id IN (SELECT id FROM tasks WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create dependencies on their tasks"
  ON task_dependencies FOR INSERT
  WITH CHECK (
    task_id IN (SELECT id FROM tasks WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete dependencies on their tasks"
  ON task_dependencies FOR DELETE
  USING (
    task_id IN (SELECT id FROM tasks WHERE user_id = auth.uid())
  );

-- ==================== RECURRING PATTERNS ====================

-- Recurring patterns table
CREATE TABLE IF NOT EXISTS recurring_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  interval_value INTEGER DEFAULT 1,
  days_of_week INTEGER[],
  day_of_month INTEGER,
  end_date TIMESTAMPTZ,
  next_occurrence TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_recurring_task_id ON recurring_patterns(task_id);
CREATE INDEX IF NOT EXISTS idx_recurring_active ON recurring_patterns(is_active, next_occurrence);

-- Enable RLS
ALTER TABLE recurring_patterns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recurring patterns
CREATE POLICY "Users can view recurring patterns on their tasks"
  ON recurring_patterns FOR SELECT
  USING (
    task_id IN (SELECT id FROM tasks WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create recurring patterns on their tasks"
  ON recurring_patterns FOR INSERT
  WITH CHECK (
    task_id IN (SELECT id FROM tasks WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update recurring patterns on their tasks"
  ON recurring_patterns FOR UPDATE
  USING (
    task_id IN (SELECT id FROM tasks WHERE user_id = auth.uid())
  )
  WITH CHECK (
    task_id IN (SELECT id FROM tasks WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete recurring patterns on their tasks"
  ON recurring_patterns FOR DELETE
  USING (
    task_id IN (SELECT id FROM tasks WHERE user_id = auth.uid())
  );

-- ==================== TASK TEMPLATES ====================

-- Task templates table
CREATE TABLE IF NOT EXISTS task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  title_template TEXT,
  description_template TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  default_labels TEXT[],
  default_tags TEXT[],
  subtask_templates JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON task_templates(user_id);

-- Enable RLS
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for templates
CREATE POLICY "Users can view their own templates"
  ON task_templates FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own templates"
  ON task_templates FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own templates"
  ON task_templates FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own templates"
  ON task_templates FOR DELETE
  USING (user_id = auth.uid());

-- ==================== BOARD MEMBERS ====================
-- IMPORTANT: Must be created BEFORE activity_logs because activity_logs references it

-- Board members table (for multi-board collaboration)
CREATE TABLE IF NOT EXISTS board_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(board_id, user_id)
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_board_members_board_id ON board_members(board_id);
CREATE INDEX IF NOT EXISTS idx_board_members_user_id ON board_members(user_id);

-- Enable RLS
ALTER TABLE board_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for board members
CREATE POLICY "Users can view members of boards they have access to"
  ON board_members FOR SELECT
  USING (
    board_id IN (SELECT id FROM boards WHERE user_id = auth.uid())
    OR board_id IN (SELECT board_id FROM board_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Board owners can add members"
  ON board_members FOR INSERT
  WITH CHECK (
    board_id IN (SELECT id FROM boards WHERE user_id = auth.uid())
  );

CREATE POLICY "Board owners can update members"
  ON board_members FOR UPDATE
  USING (
    board_id IN (SELECT id FROM boards WHERE user_id = auth.uid())
  );

CREATE POLICY "Board owners can remove members"
  ON board_members FOR DELETE
  USING (
    board_id IN (SELECT id FROM boards WHERE user_id = auth.uid())
  );

-- ==================== ACTIVITY LOG ====================
-- IMPORTANT: Must be created AFTER board_members

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  action_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_activity_board_id ON activity_logs(board_id);
CREATE INDEX IF NOT EXISTS idx_activity_task_id ON activity_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_activity_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_created_at ON activity_logs(created_at DESC);

-- Enable RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for activity logs
CREATE POLICY "Users can view activity logs on their boards"
  ON activity_logs FOR SELECT
  USING (
    board_id IN (SELECT id FROM boards WHERE user_id = auth.uid())
    OR board_id IN (SELECT board_id FROM board_members WHERE user_id = auth.uid())
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can insert activity logs"
  ON activity_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ==================== TRIGGERS FOR ACTIVITY LOG ====================

-- Function to log task activity
CREATE OR REPLACE FUNCTION log_task_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Log task creation
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_logs (board_id, task_id, user_id, action_type, action_details)
    VALUES (NEW.board_id, NEW.id, NEW.user_id, 'task_created', jsonb_build_object('title', NEW.title));
    RETURN NEW;
  END IF;

  -- Log task updates
  IF TG_OP = 'UPDATE' THEN
    -- Check what changed
    IF OLD.column_id IS DISTINCT FROM NEW.column_id THEN
      INSERT INTO activity_logs (board_id, task_id, user_id, action_type, action_details)
      VALUES (NEW.board_id, NEW.id, NEW.user_id, 'task_moved', jsonb_build_object(
        'from_column', OLD.column_id,
        'to_column', NEW.column_id
      ));
    END IF;

    IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN
      INSERT INTO activity_logs (board_id, task_id, user_id, action_type, action_details)
      VALUES (NEW.board_id, NEW.id, NEW.user_id, 'due_date_changed', jsonb_build_object(
        'old_date', OLD.due_date,
        'new_date', NEW.due_date
      ));
    END IF;

    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
      INSERT INTO activity_logs (board_id, task_id, user_id, action_type, action_details)
      VALUES (NEW.board_id, NEW.id, NEW.user_id, 'priority_changed', jsonb_build_object(
        'old_priority', OLD.priority,
        'new_priority', NEW.priority
      ));
    END IF;

    IF OLD.is_archived IS DISTINCT FROM NEW.is_archived THEN
      INSERT INTO activity_logs (board_id, task_id, user_id, action_type, action_details)
      VALUES (NEW.board_id, NEW.id, NEW.user_id, CASE WHEN NEW.is_archived THEN 'task_archived' ELSE 'task_restored' END, '{}');
    END IF;

    RETURN NEW;
  END IF;

  -- Log task deletion
  IF TG_OP = 'DELETE' THEN
    INSERT INTO activity_logs (board_id, task_id, user_id, action_type, action_details)
    VALUES (OLD.board_id, OLD.id, OLD.user_id, 'task_deleted', jsonb_build_object('title', OLD.title));
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for task activity logging
DROP TRIGGER IF EXISTS task_activity_trigger ON tasks;
CREATE TRIGGER task_activity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW EXECUTE FUNCTION log_task_activity();

-- ==================== GRANT PERMISSIONS ====================

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
