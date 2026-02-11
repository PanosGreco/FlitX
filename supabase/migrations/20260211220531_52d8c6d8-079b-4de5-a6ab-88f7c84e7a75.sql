
-- Add note_date column to user_notes for date-based notes
ALTER TABLE public.user_notes ADD COLUMN note_date date NOT NULL DEFAULT CURRENT_DATE;

-- Create index for efficient date-based lookups
CREATE INDEX idx_user_notes_user_date ON public.user_notes (user_id, note_date);
