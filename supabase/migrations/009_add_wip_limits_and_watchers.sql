-- ============================================
-- Migration: WIP Limits and Task Watchers
-- Includes: Column WIP limits, Task watchers table
-- ============================================

-- ==================== WIP LIMITS ====================

-- Add wip_limit column to columns table
ALTER TABLE columns ADD COLUMN IF NOT EXISTS wip_limit INTEGER DEFAULT NULL;

-- Add constraint to ensure wip_limit is positive if set
ALTER TABLE columns ADD CONSTRAINT chk_wip_limit_positive
  CHECK (wip_limit IS NULL OR wip_limit > 0);

-- ==================== TASK WATCHERS ====================

-- Task watchers table (for following tasks without being assigned)
CREATE TABLE IF NOT EXISTS task_watchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_watchers_task_id ON task_watchers(task_id);
CREATE INDEX IF NOT EXISTS idx_task_watchers_user_id ON task_watchers(user_id);

-- Enable RLS
ALTER TABLE task_watchers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task watchers
CREATE POLICY "Users can view watchers on tasks they can access"
  ON task_watchers FOR SELECT
  USING (
    task_id IN (SELECT id FROM tasks WHERE user_id = auth.uid())
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can watch tasks they can view"
  ON task_watchers FOR INSERT
  WITH CHECK (
    task_id IN (SELECT id FROM tasks WHERE user_id = auth.uid())
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can unwatch tasks"
  ON task_watchers FOR DELETE
  USING (user_id = auth.uid());

-- ==================== REMINDERS ====================

-- Add reminder_at column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_at TIMESTAMPTZ;

-- ==================== COVER IMAGES ====================

-- Add cover_image_url column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- ==================== GRANT PERMISSIONS ====================

GRANT ALL ON task_watchers TO authenticated;
