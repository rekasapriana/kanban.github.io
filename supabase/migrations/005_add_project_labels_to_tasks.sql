-- Add project_id column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Create task_labels junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS task_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(task_id, label_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_task_labels_task_id ON task_labels(task_id);
CREATE INDEX IF NOT EXISTS idx_task_labels_label_id ON task_labels(label_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);

-- Enable RLS on task_labels
ALTER TABLE task_labels ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for task_labels
CREATE POLICY "Users can view task labels for their tasks"
  ON task_labels FOR SELECT
  USING (
    task_id IN (SELECT id FROM tasks WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert task labels for their tasks"
  ON task_labels FOR INSERT
  WITH CHECK (
    task_id IN (SELECT id FROM tasks WHERE user_id = auth.uid())
    AND label_id IN (SELECT id FROM labels WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete task labels for their tasks"
  ON task_labels FOR DELETE
  USING (
    task_id IN (SELECT id FROM tasks WHERE user_id = auth.uid())
  );
