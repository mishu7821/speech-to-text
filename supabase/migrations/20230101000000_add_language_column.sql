-- Add language column to transcripts table if it doesn't exist yet
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'transcripts' 
    AND column_name = 'language'
  ) THEN
    ALTER TABLE public.transcripts 
    ADD COLUMN language TEXT DEFAULT 'en-US';
  END IF;
END $$; 