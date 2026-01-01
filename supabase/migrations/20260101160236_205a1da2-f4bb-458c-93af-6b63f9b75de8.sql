-- Add task_type and vehicle_id columns to daily_tasks table
ALTER TABLE public.daily_tasks 
ADD COLUMN task_type text NOT NULL DEFAULT 'other',
ADD COLUMN vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL;

-- Add constraint to validate task_type values
ALTER TABLE public.daily_tasks 
ADD CONSTRAINT valid_task_type CHECK (task_type IN ('return', 'delivery', 'other'));

-- Create index for efficient date and user filtering
CREATE INDEX idx_daily_tasks_user_date ON public.daily_tasks(user_id, due_date);
CREATE INDEX idx_daily_tasks_vehicle ON public.daily_tasks(vehicle_id);