-- NOTE: Run this in the Supabase SQL Editor to set up your database schema

-- Enable the UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create a table for chat transcripts
CREATE TABLE IF NOT EXISTS public.transcripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT DEFAULT 'New Transcript',
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a table for transcript content
CREATE TABLE IF NOT EXISTS public.transcript_contents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transcript_id UUID REFERENCES public.transcripts(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS transcripts_user_id_idx ON public.transcripts(user_id);
CREATE INDEX IF NOT EXISTS transcripts_created_at_idx ON public.transcripts(created_at);
CREATE INDEX IF NOT EXISTS transcript_contents_transcript_id_idx ON public.transcript_contents(transcript_id);

-- Set up Row Level Security (RLS)
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcript_contents ENABLE ROW LEVEL SECURITY;

-- Create policies for transcripts table
CREATE POLICY "Users can view their own transcripts" 
  ON public.transcripts 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transcripts" 
  ON public.transcripts 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transcripts" 
  ON public.transcripts 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transcripts" 
  ON public.transcripts 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create policies for transcript_contents table
CREATE POLICY "Users can view their own transcript contents" 
  ON public.transcript_contents 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.transcripts 
    WHERE transcripts.id = transcript_contents.transcript_id 
    AND transcripts.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert into their own transcript contents" 
  ON public.transcript_contents 
  FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.transcripts 
    WHERE transcripts.id = transcript_contents.transcript_id 
    AND transcripts.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own transcript contents" 
  ON public.transcript_contents 
  FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.transcripts 
    WHERE transcripts.id = transcript_contents.transcript_id 
    AND transcripts.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own transcript contents" 
  ON public.transcript_contents 
  FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM public.transcripts 
    WHERE transcripts.id = transcript_contents.transcript_id 
    AND transcripts.user_id = auth.uid()
  )); 