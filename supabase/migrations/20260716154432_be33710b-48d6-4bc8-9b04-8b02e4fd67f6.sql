
-- Lock down roleplay_sessions: app uses service role via server functions only.
DROP POLICY IF EXISTS "POC open insert on roleplay_sessions" ON public.roleplay_sessions;
DROP POLICY IF EXISTS "POC open read on roleplay_sessions" ON public.roleplay_sessions;
DROP POLICY IF EXISTS "POC open update on roleplay_sessions" ON public.roleplay_sessions;

REVOKE ALL ON public.roleplay_sessions FROM anon, authenticated;
GRANT ALL ON public.roleplay_sessions TO service_role;

-- RLS remains enabled with no policies => anon/authenticated denied by default.
-- service_role bypasses RLS, so server functions continue to work.

-- Lock down roleplay-audio storage: only service role can access objects.
DROP POLICY IF EXISTS "roleplay_audio_select" ON storage.objects;
DROP POLICY IF EXISTS "roleplay_audio_insert" ON storage.objects;
DROP POLICY IF EXISTS "roleplay_audio_update" ON storage.objects;
DROP POLICY IF EXISTS "roleplay_audio_delete" ON storage.objects;

CREATE POLICY "roleplay_audio_deny_anon_authenticated_select"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (false);

CREATE POLICY "roleplay_audio_deny_anon_authenticated_insert"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "roleplay_audio_deny_anon_authenticated_update"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "roleplay_audio_deny_anon_authenticated_delete"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (false);
