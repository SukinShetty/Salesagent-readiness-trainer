
-- Roleplay sessions store each recorded training call.
-- POC access model: open reads/writes for the app; trainer-role gating,
-- retention, and deletion policies to be finalized with KGIS before production.
CREATE TABLE public.roleplay_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_session_id TEXT NOT NULL,
  trainee_name TEXT,
  trainee_id TEXT,
  batch TEXT,
  project TEXT,
  provider TEXT,
  core_module TEXT,
  sub_option TEXT,
  scenario TEXT,
  difficulty TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  conversation_id TEXT,
  transcript TEXT,
  audio_path TEXT,
  audio_status TEXT NOT NULL DEFAULT 'pending',
  audio_error TEXT,
  evaluation JSONB,
  evaluation_status TEXT NOT NULL DEFAULT 'pending',
  consent_given BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX roleplay_sessions_client_session_id_idx
  ON public.roleplay_sessions (client_session_id);
CREATE INDEX roleplay_sessions_conversation_id_idx
  ON public.roleplay_sessions (conversation_id);

GRANT SELECT, INSERT, UPDATE ON public.roleplay_sessions TO anon, authenticated;
GRANT ALL ON public.roleplay_sessions TO service_role;

ALTER TABLE public.roleplay_sessions ENABLE ROW LEVEL SECURITY;

-- POC policies: open access. Production will scope to trainer role.
CREATE POLICY "POC open read on roleplay_sessions"
  ON public.roleplay_sessions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "POC open insert on roleplay_sessions"
  ON public.roleplay_sessions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "POC open update on roleplay_sessions"
  ON public.roleplay_sessions FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_roleplay_sessions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_roleplay_sessions_updated_at
BEFORE UPDATE ON public.roleplay_sessions
FOR EACH ROW EXECUTE FUNCTION public.set_roleplay_sessions_updated_at();
