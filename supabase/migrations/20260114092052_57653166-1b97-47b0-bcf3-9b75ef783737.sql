-- Create user_notes table for quick notes
CREATE TABLE public.user_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_notes
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_notes
CREATE POLICY "Users can view their own notes" 
ON public.user_notes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notes" 
ON public.user_notes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes" 
ON public.user_notes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes" 
ON public.user_notes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates on user_notes
CREATE TRIGGER update_user_notes_updated_at
BEFORE UPDATE ON public.user_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create user_reminders table
CREATE TABLE public.user_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  frequency TEXT DEFAULT 'one_time',
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_reminders
ALTER TABLE public.user_reminders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_reminders
CREATE POLICY "Users can view their own reminders" 
ON public.user_reminders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reminders" 
ON public.user_reminders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reminders" 
ON public.user_reminders 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminders" 
ON public.user_reminders 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates on user_reminders
CREATE TRIGGER update_user_reminders_updated_at
BEFORE UPDATE ON public.user_reminders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for efficient querying
CREATE INDEX idx_user_reminders_user_due_date ON public.user_reminders(user_id, due_date);
CREATE INDEX idx_user_reminders_completed ON public.user_reminders(user_id, is_completed);
CREATE INDEX idx_user_notes_user_id ON public.user_notes(user_id);