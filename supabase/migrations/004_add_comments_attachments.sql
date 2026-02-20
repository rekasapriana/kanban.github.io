-- Migration: Add task comments and attachments tables
-- Run this in Supabase SQL Editor

-- ==================== TASK COMMENTS ====================
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Policies for task_comments
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can view comments on their tasks" ON task_comments;
  DROP POLICY IF EXISTS "Users can create comments on their tasks" ON task_comments;
  DROP POLICY IF EXISTS "Users can update their own comments" ON task_comments;
  DROP POLICY IF EXISTS "Users can delete their own comments" ON task_comments;

  -- Create new policies
  CREATE POLICY "Users can view comments on their tasks"
    ON task_comments FOR SELECT
    USING (task_id IN (SELECT id FROM tasks WHERE user_id = auth.uid()));

  CREATE POLICY "Users can create comments on their tasks"
    ON task_comments FOR INSERT
    WITH CHECK (task_id IN (SELECT id FROM tasks WHERE user_id = auth.uid()));

  CREATE POLICY "Users can update their own comments"
    ON task_comments FOR UPDATE
    USING (user_id = auth.uid());

  CREATE POLICY "Users can delete their own comments"
    ON task_comments FOR DELETE
    USING (user_id = auth.uid());
END $$;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON task_comments(user_id);

-- ==================== TASK ATTACHMENTS ====================
CREATE TABLE IF NOT EXISTS task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

-- Policies for task_attachments
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can view attachments on their tasks" ON task_attachments;
  DROP POLICY IF EXISTS "Users can create attachments on their tasks" ON task_attachments;
  DROP POLICY IF EXISTS "Users can delete their own attachments" ON task_attachments;

  -- Create new policies
  CREATE POLICY "Users can view attachments on their tasks"
    ON task_attachments FOR SELECT
    USING (task_id IN (SELECT id FROM tasks WHERE user_id = auth.uid()));

  CREATE POLICY "Users can create attachments on their tasks"
    ON task_attachments FOR INSERT
    WITH CHECK (task_id IN (SELECT id FROM tasks WHERE user_id = auth.uid()));

  CREATE POLICY "Users can delete their own attachments"
    ON task_attachments FOR DELETE
    USING (user_id = auth.uid());
END $$;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_user_id ON task_attachments(user_id);

-- ==================== STORAGE BUCKET FOR ATTACHMENTS ====================
-- Create attachments bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for attachments bucket
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Anyone can view attachments" ON storage.objects;
  DROP POLICY IF EXISTS "Users can upload attachments" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own attachments" ON storage.objects;

  -- Create new policies
  CREATE POLICY "Anyone can view attachments"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'attachments');

  CREATE POLICY "Users can upload attachments"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

  CREATE POLICY "Users can delete their own attachments"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
END $$;
