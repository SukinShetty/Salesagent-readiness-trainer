import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Securely retrieve the completed conversation audio from the voice provider
 * and store it in the private `roleplay-audio` bucket. The provider API key
 * (`ELEVENLABS_API_KEY`) is read from server env inside the handler and is
 * never exposed to the client.
 *
 * Recording may not be available for up to ~90s after the call ends, so we
 * apply a bounded retry (2s, 3s, 5s, 8s, 13s, 20s, 30s) and STOP on any
 * permanent error (auth, invalid id). Never polls indefinitely.
 *
 * Callable in two shapes:
 *  - `{ sessionId, conversationId }` – primary flow from the roleplay page
 *  - `{ sessionId }` – re-kick flow from the evaluation page which looks up
 *    the stored `conversation_id` on the DB row. Lets the trainer press
 *    "Check Recording Status" to re-attempt when the recording processes
 *    later than expected.
 */

const input = z.object({
  sessionId: z.string().uuid(),
  conversationId: z.string().min(1).max(200).optional(),
});

const BACKOFF_MS = [2_000, 3_000, 5_000, 8_000, 13_000, 20_000, 30_000];
const IS_DEV = process.env.NODE_ENV !== "production";

export const retrieveRoleplayAudio = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => input.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return await recordFailure(
        data.sessionId,
        "Voice provider is not configured on the server.",
        "unavailable",
      );
    }

    // Resolve conversationId: prefer input, else look up on the DB row.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let conversationId = data.conversationId ?? null;
    if (!conversationId) {
      const { data: row, error } = await supabaseAdmin
        .from("roleplay_sessions")
        .select("conversation_id")
        .eq("id", data.sessionId)
        .maybeSingle();
      if (error) {
        return await recordFailure(data.sessionId, `Session lookup failed: ${error.message}`, "failed");
      }
      conversationId = row?.conversation_id ?? null;
    }
    if (!conversationId) {
      return await recordFailure(
        data.sessionId,
        "No conversation reference stored for this attempt.",
        "unavailable",
      );
    }

    // Mark as processing so the UI can show the correct interim state.
    await supabaseAdmin
      .from("roleplay_sessions")
      .update({ audio_status: "processing", audio_error: null })
      .eq("id", data.sessionId);

    const url = `https://api.elevenlabs.io/v1/convai/conversations/${encodeURIComponent(
      conversationId,
    )}/audio`;

    let lastStatus = 0;
    let audioBytes: ArrayBuffer | null = null;
    let contentType = "audio/mpeg";

    for (let attempt = 0; attempt < BACKOFF_MS.length; attempt++) {
      if (IS_DEV) {
        console.log(
          `[Audio] attempt ${attempt + 1}/${BACKOFF_MS.length} session=${data.sessionId} conv=${conversationId}`,
        );
      }
      // Wait BEFORE first attempt: recording is never instant.
      await sleep(BACKOFF_MS[attempt]);
      let res: Response;
      try {
        res = await fetch(url, {
          headers: { "xi-api-key": apiKey, accept: "audio/mpeg" },
        });
      } catch (e) {
        if (IS_DEV) console.warn("[Audio] fetch threw", e);
        continue;
      }
      lastStatus = res.status;
      if (IS_DEV) console.log(`[Audio] status=${res.status} attempt=${attempt + 1}`);
      if (res.ok) {
        contentType = res.headers.get("content-type") ?? contentType;
        audioBytes = await res.arrayBuffer();
        break;
      }
      // Permanent failures — stop retrying.
      if (res.status === 401 || res.status === 403) {
        const body = await res.text().catch(() => "");
        return await recordFailure(
          data.sessionId,
          `Voice provider authentication failed (${res.status}). ${body.slice(0, 200)}`,
          "failed",
        );
      }
      if (res.status === 400 || res.status === 422) {
        const body = await res.text().catch(() => "");
        return await recordFailure(
          data.sessionId,
          `Invalid conversation reference (${res.status}). ${body.slice(0, 200)}`,
          "failed",
        );
      }
      // 404 / 425 / 202 / 5xx: treat as "not ready yet" and continue backoff.
    }

    if (!audioBytes) {
      // Not permanent yet — mark as processing so the UI can offer a re-check.
      await supabaseAdmin
        .from("roleplay_sessions")
        .update({
          audio_status: "processing",
          audio_error: `Recording not yet available (last status ${lastStatus}).`,
        })
        .eq("id", data.sessionId);
      return {
        status: "processing" as const,
        error: `Recording not yet available (last status ${lastStatus}).`,
      };
    }

    const ext = contentType.includes("mpeg") ? "mp3" : contentType.includes("wav") ? "wav" : "mp3";
    const path = `${data.sessionId}.${ext}`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("roleplay-audio")
      .upload(path, new Uint8Array(audioBytes), {
        contentType,
        upsert: true,
      });
    if (upErr) {
      return await recordFailure(data.sessionId, `Storage upload failed: ${upErr.message}`, "failed");
    }

    const { error: dbErr } = await supabaseAdmin
      .from("roleplay_sessions")
      .update({ audio_path: path, audio_status: "ready", audio_error: null })
      .eq("id", data.sessionId);
    if (dbErr) throw new Error(dbErr.message);

    if (IS_DEV) console.log(`[Audio] stored session=${data.sessionId} path=${path}`);
    return { status: "ready" as const };
  });

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function recordFailure(
  sessionId: string,
  message: string,
  status: "failed" | "unavailable",
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin
    .from("roleplay_sessions")
    .update({ audio_status: status, audio_error: message })
    .eq("id", sessionId);
  if (IS_DEV) console.warn(`[Audio] ${status} session=${sessionId}: ${message}`);
  return { status, error: message };
}
