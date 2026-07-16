# KGIS Sales Training AI — Audio Capture & Voice Evaluation

## Prerequisites (need your approval)

This work requires backend + storage + a private ElevenLabs API key. Two things must be enabled before I start:

1. **Enable Lovable Cloud** — needed for:
   - A `roleplay_sessions` table (session metadata, transcript, audio reference, evaluation status)
   - A private storage bucket `roleplay-audio` (never public)
   - A server function to fetch audio from ElevenLabs securely and to sign playback URLs
2. **Add an ElevenLabs API key** as a server-side secret (`ELEVENLABS_API_KEY`). This is the account-level key that can read completed conversation audio. It is stored server-only and never shipped to the browser.

For the POC I will store sessions and recordings without a full role-based auth system. I will add a note that trainer-only access, retention, and deletion are to be finalized with KGIS before production. If you want proper trainer login now, say so and I will add email/password auth + a `trainer` role behind the trainer/evaluation pages.

---

## 1. Consent gate (Start Training page)

- Add the consent block above the "Start Sales Roleplay" button:
  > "This simulated training call will be recorded and analysed for coaching and assessment purposes."
- Required checkbox: "I understand and consent to this training recording."
- Submit button disabled until checked. Consent flag persisted on the session.

## 2. Capture conversation ID (Live Roleplay)

- After `startSession` resolves, read the conversation ID via `controls.getId()` (SDK) and store it on the session in memory + `roleplay_sessions`.
- Never rendered in the UI.
- On End Roleplay: mark end time, duration, persist transcript, kick off audio retrieval (fire-and-forget), then route to Evaluation. Evaluation page polls the session row for `audio_status`.

## 3. Server function: `retrieveRoleplayAudio`

`src/lib/roleplay-audio.functions.ts` — a `createServerFn` (POST):

- Input: `sessionId`, `conversationId`.
- Steps:
  1. Load the session row (must exist, must belong to caller's local session — POC: keyed by client-generated session ID).
  2. GET `https://api.elevenlabs.io/v1/convai/conversations/{id}/audio` with `xi-api-key: ELEVENLABS_API_KEY`.
  3. If 404 / "audio not ready", retry with backoff (up to 5 attempts, ~30s total). No indefinite polling.
  4. On success: upload the returned MP3 to the private bucket at `roleplay-audio/{sessionId}.mp3`.
  5. Update the session row: `audio_path`, `audio_status = 'ready'`, `audio_error = null`.
  6. On terminal failure: `audio_status = 'failed'`, `audio_error = short message`.
- Returns `{ status, audioPath? }`. Never returns the raw file or the API key.

Second server function `getRoleplayAudioUrl({ sessionId })` returns a short-lived signed URL from Supabase Storage for the trainer player.

Called from the client via `useServerFn` — never a raw `fetch` to ElevenLabs.

## 4. Data model

Migration adds:

```sql
create table public.roleplay_sessions (
  id uuid primary key default gen_random_uuid(),
  client_session_id text not null,          -- links to browser localStorage session
  trainee_name text, trainee_id text, batch text,
  project text, provider text, module text, sub_option text,
  scenario text, difficulty text,
  started_at timestamptz, ended_at timestamptz, duration_seconds int,
  conversation_id text,
  transcript text,
  audio_path text, audio_status text default 'pending', audio_error text,
  evaluation jsonb, evaluation_status text default 'pending',
  created_at timestamptz default now()
);
```

Grants + RLS: POC-open policies with an explicit comment that KGIS finalizes trainer-role gating. Storage bucket `roleplay-audio` is private; access only via signed URLs from the server function.

## 5. Trainer audio player component

- New `RoleplayAudioPlayer` component built on the native HTML `<audio>` element with a KGIS-styled shell: Play/Pause, seek bar, elapsed / duration, and a 0.75× / 1× / 1.25× / 1.5× speed selector.
- Rendered in Evaluation Report and Trainer View. States:
  - `pending` → "Preparing recording…"
  - `ready` → player
  - `failed` → "Audio recording could not be retrieved. Voice-based communication analysis is unavailable for this attempt."
- No vendor branding, no conversation ID visible.

## 6. Evaluation Report — two score groups

Reorganize the report into two clearly separated sections:

**A. Call Content and Process** (existing QMF: Opening, Discovery, Pitching, Objection Handling, Compliance, Closing, Soft Skills) — driven by transcript.

**B. Communication and Customer Handling** (NEW) — driven by audio when available:
- Politeness/professionalism, Confidence, Clarity, Speaking pace, Volume consistency, Hesitation/fillers, Interruptions, Active listening, Empathy, Calmness under objection, Rude/aggressive behaviour, Rapport, Call control.
- Ratings: Excellent / Effective / Needs Improvement / Critical Concern / Not Enough Evidence.
- Each dimension shows rating + short explanation + timestamp evidence when we have it + coaching recommendation.
- If audio not available: whole section shows "Voice-based communication analysis was not completed." — no fabricated tone scores.

**Critical behaviour flags** panel (rude language, aggression, sarcasm, repeated interruption, talking over customer, too fast/slow, low confidence, monotone, ignoring concerns). Any critical flag blocks "Production Ready" certification in Assessment Mode and requires trainer review.

**Combined readiness** shows a recommendation but the final decision remains the trainer override that already exists.

## 7. Audio analysis (POC scope)

To keep this a working POC without a heavy ML pipeline, voice analysis is derived from what we can reliably measure:

- Words-per-minute from transcript + call duration → pace rating.
- Filler-word counts ("um", "uh", "like", "you know") → hesitation.
- Trainee turn count and short-turn ratio → interruption / active listening heuristics.
- Politeness / rude-language lexicon scan on trainee turns → flags.
- If audio retrieval failed → section is marked "Not Enough Evidence" for every dimension and no tone scores are invented.

I will label this section clearly as heuristic analysis and add the POC note that KGIS-provided acoustic analysis (prosody, volume) is required for production.

## 8. Privacy note

Add a POC banner on the Evaluation Report:
> "Recording retention, trainer access, download permissions, consent wording, and deletion policies will be finalized with KGIS before production deployment."

## 9. Verification

Manual test pass: consent required, session row created on Start, conversation ID captured (log only), audio arrives within ~30s and plays in Trainer View + Evaluation, transcript+audio linked to the same trainee row, tone flags only appear when audio evidence exists, no API key or vendor name in client bundle or UI.

---

## Please confirm

1. Enable Lovable Cloud now? (yes/no)
2. Add the ElevenLabs API key as `ELEVENLABS_API_KEY` server secret? (yes — I'll open the secure form after you approve)
3. Stay with open POC access for `roleplay_sessions` + audio (recommended for the current POC), or add trainer email/password login + `trainer` role gating now?
