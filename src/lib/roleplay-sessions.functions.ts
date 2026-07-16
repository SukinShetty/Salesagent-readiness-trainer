import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Server functions for KGIS roleplay session persistence.
 *
 * All Data API calls use the service-role admin client because this POC has
 * no per-user auth model. Trainer-role gating, retention, and deletion
 * policies will be finalized with KGIS before production deployment.
 *
 * `supabaseAdmin` is imported inside each handler with `await import(...)` to
 * keep the server-only module out of the client bundle graph.
 */

const startInput = z.object({
  clientSessionId: z.string().min(1).max(200),
  traineeName: z.string().max(200).optional(),
  traineeId: z.string().max(200).optional(),
  batch: z.string().max(200).optional(),
  project: z.string().max(200).optional(),
  provider: z.string().max(200).optional(),
  coreModule: z.string().max(200).optional(),
  subOption: z.string().max(200).optional(),
  scenario: z.string().max(200).optional(),
  difficulty: z.string().max(200).optional(),
  consentGiven: z.boolean(),
});

export const createRoleplaySession = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => startInput.parse(data))
  .handler(async ({ data }) => {
    if (!data.consentGiven) throw new Error("Recording consent is required.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("roleplay_sessions")
      .insert({
        client_session_id: data.clientSessionId,
        trainee_name: data.traineeName ?? null,
        trainee_id: data.traineeId ?? null,
        batch: data.batch ?? null,
        project: data.project ?? null,
        provider: data.provider ?? null,
        core_module: data.coreModule ?? null,
        sub_option: data.subOption ?? null,
        scenario: data.scenario ?? null,
        difficulty: data.difficulty ?? null,
        consent_given: data.consentGiven,
        started_at: new Date().toISOString(),
        audio_status: "pending",
        evaluation_status: "pending",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { sessionId: row.id as string };
  });

const conversationInput = z.object({
  sessionId: z.string().uuid(),
  conversationId: z.string().min(1).max(200),
});

export const attachConversationId = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => conversationInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("roleplay_sessions")
      .update({ conversation_id: data.conversationId })
      .eq("id", data.sessionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const finalizeInput = z.object({
  sessionId: z.string().uuid(),
  endedAt: z.string().min(1),
  durationSeconds: z.number().int().nonnegative(),
  transcript: z.string().max(200_000),
  evaluation: z.unknown().optional(),
});

export const finalizeRoleplaySession = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => finalizeInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("roleplay_sessions")
      .update({
        ended_at: data.endedAt,
        duration_seconds: data.durationSeconds,
        transcript: data.transcript,
        evaluation: (data.evaluation ?? null) as never,
        evaluation_status: data.evaluation ? "ready" : "pending",
      })
      .eq("id", data.sessionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const idInput = z.object({ sessionId: z.string().uuid() });

export const getRoleplaySession = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => idInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("roleplay_sessions")
      .select(
        "id, conversation_id, audio_path, audio_status, audio_error, evaluation, evaluation_status, transcript, duration_seconds",
      )
      .eq("id", data.sessionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const getRoleplayAudioSignedUrl = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => idInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("roleplay_sessions")
      .select("audio_path, audio_status")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row?.audio_path || row.audio_status !== "ready") {
      return { url: null as string | null };
    }
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from("roleplay-audio")
      .createSignedUrl(row.audio_path, 60 * 30);
    if (signErr) throw new Error(signErr.message);
    return { url: signed.signedUrl };
  });
