-- Create maintenance_blocks table for calendar-based maintenance periods
CREATE TABLE public.maintenance_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT end_date_after_start CHECK (end_date >= start_date)
);

-- Enable Row Level Security
ALTER TABLE public.maintenance_blocks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own maintenance blocks" 
ON public.maintenance_blocks 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own maintenance blocks" 
ON public.maintenance_blocks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own maintenance blocks" 
ON public.maintenance_blocks 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own maintenance blocks" 
ON public.maintenance_blocks 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_maintenance_blocks_updated_at
BEFORE UPDATE ON public.maintenance_blocks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();