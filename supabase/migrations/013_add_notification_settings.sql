-- Add notification settings columns to user_settings table
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS due_date_reminders BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS task_assigned BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS comment_mentions BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS task_completed BOOLEAN DEFAULT true;

-- Update RLS policy for update
CREATE POLICY "Users can update their own settings" ON public.user_settings
  FOR UPDATE USING (auth.uid() = user_id);
