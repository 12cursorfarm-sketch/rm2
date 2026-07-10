ALTER TABLE public.members ADD COLUMN IF NOT EXISTS pending_deletion BOOLEAN DEFAULT false;
