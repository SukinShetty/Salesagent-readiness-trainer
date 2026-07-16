import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Securely retrieve the completed conversation audio from the voice provider
 * and store it in the private `roleplay-audio` bucket. The provider API key
 * (`ELEVENLABS_API_KEY`) is read from server env inside the handler and is
 * never exposed to the client.
 *
 * If the provider reports the audio is not yet available, we retry with a
 * bounded backoff (5 attempts, ~30s total) — no indefinite polling.
 */

const input = z.object({
  sessionId: z.string().uuid(),
  conversationId: z.string().min(1).max(200),
});

const MAX_ATTEMPTS = 5;
const BACKOFF_MS = [1_500, 3_000, 5_000, 8_000, 12_000];

export const retrieveRoleplayAudio = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => input.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return await recordFailure(data.sessionId, "Voice provider is not configured on the server.");
    }

    const url = `https://api.elevenlabs.io/v1/convai/conversations/${encodeURIComponent(data.conversationId)}/audio`;

    let lastStatus = 0;
    let audioBytes: ArrayBuffer | null = null;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const res = await fetch(url, {
        headers: { "xi-api-key": apiKey, accept: "audio/mpeg" },
      });
      lastStatus = res.status;
      if (res.ok) {
        audioBytes = await res.arrayBuffer();
        break;
      }
      // 404/425 = not ready yet. Anything else terminal.
      if (res.status !== 404 && res.status !== 425 && res.status !== 202) {
        const body = await res.text().catch(() => "");
        return await recordFailure(
          data.sessionId,
          `Audio retrieval failed (${res.status}): ${body.slice(0, 300)}`,
        );
      }
      await sleep(BACKOFF_MS[attempt] ?? 12_000);
    }

    if (!audioBytes) {
      return await recordFailure(
        data.sessionId,
        `Audio not available after ${MAX_ATTEMPTS} attempts (last status ${lastStatus}).`,
      );
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const path = `${data.sessionId}.mp3`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("roleplay-audio")
      .upload(path, new Uint8Array(audioBytes), {
        contentType: "audio/mpeg",
        upsert: true,
      });
    if (upErr) {
      return await recordFailure(data.sessionId, `Storage upload failed: ${upErr.message}`);
    }

    const { error: dbErr } = await supabaseAdmin
      .from("roleplay_sessions")
      .update({ audio_path: path, audio_status: "ready", audio_error: null })
      .eq("id", data.sessionId);
    if (dbErr) throw new Error(dbErr.message);

    return { status: "ready" as const };
  });

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function recordFailure(sessionId: string, message: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin
    .from("roleplay_sessions")
    .update({ audio_status: "failed", audio_error: message })
    .eq("id", sessionId);
  return { status: "failed" as const, error: message };
}
