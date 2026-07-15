import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { AppShell } from "@/components/AppShell";
import { scenarios, trainees, demoTranscript } from "@/lib/mock-data";

const AGENT_ID = "agent_6801kxj68508fhdb7p2hzrqbrerw";

type Search = { trainee?: string; scenario?: string };

export const Route = createFileRoute("/roleplay")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    trainee: typeof s.trainee === "string" ? s.trainee : undefined,
    scenario: typeof s.scenario === "string" ? s.scenario : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Live Roleplay · KGIS Sales Training AI" },
      { name: "description", content: "Live AI voice roleplay with the KGIS AI Telecom Customer." },
    ],
  }),
  component: LiveRoleplayPage,
});

function LiveRoleplayPage() {
  return (
    <ConversationProvider>
      <LiveRoleplay />
    </ConversationProvider>
  );
}

type DisplayStatus =
  | "Ready"
  | "Connecting"
  | "Customer Listening"
  | "Customer Speaking"
  | "Roleplay Completed"
  | "Connection Failed";

/**
 * For a future authenticated agent, replace this with a fetch to a backend
 * server function that returns { conversationToken } from ElevenLabs, then
 * call conversation.startSession({ conversationToken, connectionType: "webrtc" }).
 */
async function getSessionStartArgs() {
  return { agentId: AGENT_ID, connectionType: "webrtc" as const };
}

function LiveRoleplay() {
  const { trainee: traineeId, scenario: scenarioId } = Route.useSearch();
  const navigate = useNavigate();

  const trainee = trainees.find((t) => t.id === traineeId) ?? trainees[0];
  const scenario =
    scenarios.find((s) => s.id === scenarioId) ??
    scenarios.find((s) => s.id === "price-sensitive") ??
    scenarios[0];

  const [transcriptText, setTranscriptText] = useState("");
  const [hasStarted, setHasStarted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const [connectFailed, setConnectFailed] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const appendedIdsRef = useRef<Set<string>>(new Set());

  const appendLine = useCallback((who: "AI Customer" | "Trainee", text: string) => {
    if (!text) return;
    setTranscriptText((prev) => (prev ? `${prev}\n${who}: ${text}` : `${who}: ${text}`));
  }, []);

  const conversation = useConversation({
    onConnect: () => {
      setConnectFailed(false);
    },
    onDisconnect: () => {
      setEnded(true);
    },
    onError: () => {
      setConnectFailed(true);
    },
    onMessage: (msg: unknown) => {
      // The SDK forwards various message shapes; try to extract user/agent text.
      const m = msg as {
        source?: string;
        message?: string;
        text?: string;
        type?: string;
      };
      const text = m?.message ?? m?.text ?? "";
      if (!text) return;
      const key = `${m?.source ?? m?.type ?? "x"}:${text}`;
      if (appendedIdsRef.current.has(key)) return;
      appendedIdsRef.current.add(key);
      if (m?.source === "user" || m?.type === "user_transcript") {
        appendLine("Trainee", text);
      } else if (m?.source === "ai" || m?.type === "agent_response") {
        appendLine("AI Customer", text);
      }
    },
  });

  const status = conversation.status; // "connected" | "connecting" | "disconnected"
  const isSpeaking = conversation.isSpeaking;
  const micMuted = isMuted;

  const displayStatus: DisplayStatus = useMemo(() => {
    if (connectFailed) return "Connection Failed";
    if (!hasStarted) return "Ready";
    if (status === "connecting") return "Connecting";
    if (status === "connected") {
      return isSpeaking ? "Customer Speaking" : "Customer Listening";
    }
    if (ended || status === "disconnected") return "Roleplay Completed";
    return "Ready";
  }, [connectFailed, hasStarted, status, isSpeaking, ended]);

  const start = useCallback(async () => {
    setConnectFailed(false);
    setMicDenied(false);
    setEnded(false);
    setHasStarted(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setMicDenied(true);
      setHasStarted(false);
      return;
    }
    try {
      const args = await getSessionStartArgs();
      await conversation.startSession(args);
    } catch {
      setConnectFailed(true);
      setHasStarted(false);
    }
  }, [conversation]);

  const end = useCallback(async () => {
    try {
      await conversation.endSession();
    } catch {
      /* noop */
    }
    setEnded(true);
  }, [conversation]);

  const toggleMute = useCallback(async () => {
    const next = !isMuted;
    try {
      // SDK exposes microphone control via setMicMuted when available.
      const c = conversation as unknown as {
        setMicMuted?: (m: boolean) => Promise<void> | void;
      };
      if (typeof c.setMicMuted === "function") {
        await c.setMicMuted(next);
      }
      setIsMuted(next);
    } catch {
      /* noop */
    }
  }, [conversation, isMuted]);

  const useDemo = () => {
    setTranscriptText(demoTranscript);
    setEnded(true);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        void Promise.resolve(conversation.endSession()).catch(() => {});
      } catch {
        /* noop */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goEvaluate = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("kgis:lastTranscript", transcriptText);
      window.sessionStorage.setItem("kgis:lastTrainee", trainee.name);
      window.sessionStorage.setItem("kgis:lastScenario", scenario.title);
    }
    navigate({ to: "/evaluation" });
  };

  const statusStyles: Record<DisplayStatus, string> = {
    Ready: "bg-secondary text-secondary-foreground",
    Connecting: "bg-teal-soft text-teal",
    "Customer Listening":
      "bg-[color-mix(in_oklab,var(--success)_18%,transparent)] text-[color-mix(in_oklab,var(--success)_60%,black)]",
    "Customer Speaking":
      "bg-[color-mix(in_oklab,var(--warning)_25%,transparent)] text-[color-mix(in_oklab,var(--warning)_50%,black)]",
    "Roleplay Completed": "bg-secondary text-secondary-foreground",
    "Connection Failed":
      "bg-[color-mix(in_oklab,var(--destructive)_20%,transparent)] text-destructive",
  };

  const focusSkills = [
    "Discovery",
    "Product recommendation",
    "FBB pitch",
    "Objection handling",
    "Compliance",
    "Closing",
  ];

  const isLive = status === "connected" || status === "connecting";

  return (
    <AppShell>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Live Roleplay</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time voice conversation with the AI customer
          </p>
        </div>
        <div className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[displayStatus]}`}>
          {displayStatus}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* LEFT */}
        <aside className="space-y-4 lg:col-span-3">
          <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Session Information
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Trainee</dt>
                <dd className="font-semibold text-foreground">{trainee.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Batch</dt>
                <dd className="text-foreground">{trainee.batch}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Project</dt>
                <dd className="text-foreground">US Telecom Sales</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Scenario</dt>
                <dd className="text-foreground">Price-Sensitive Customer</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Difficulty</dt>
                <dd className="text-foreground">Medium</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Training Focus
            </div>
            <ul className="mt-3 space-y-2 text-sm text-foreground">
              {focusSkills.map((sk) => (
                <li key={sk} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal" />
                  {sk}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* CENTER — AI Customer */}
        <section className="lg:col-span-6">
          <div className="rounded-2xl border border-border bg-gradient-to-br from-surface to-[color-mix(in_oklab,var(--teal-soft)_60%,var(--surface))] p-6 shadow-elevated">
            <div className="flex items-start gap-5">
              <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary text-2xl font-semibold text-primary-foreground shadow-elevated">
                RM
                {displayStatus === "Customer Listening" && (
                  <span className="pointer-events-none absolute inset-0 rounded-2xl ring-4 ring-teal/40 animate-pulse" />
                )}
              </div>
              <div className="flex-1">
                <div className="text-xs font-medium uppercase tracking-wide text-teal">AI Customer</div>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                  Rachel Miller
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  US home customer · works from home · family of four
                </p>
                <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-teal-soft px-3 py-1 text-xs font-medium text-teal">
                  Mood: Cautious but open
                </div>
              </div>
            </div>

            {/* Custom waveform */}
            <div className="mt-6 flex h-24 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface/60 px-6">
              {Array.from({ length: 32 }).map((_, i) => {
                const speaking = displayStatus === "Customer Speaking";
                const listening = displayStatus === "Customer Listening";
                return (
                  <span
                    key={i}
                    className="waveform-bar"
                    style={{
                      animationDelay: `${i * 55}ms`,
                      animationPlayState: speaking ? "running" : "paused",
                      height: speaking ? undefined : listening ? "10px" : "6px",
                      opacity: speaking ? 1 : listening ? 0.5 : 0.25,
                    }}
                  />
                );
              })}
            </div>

            {/* Errors */}
            {micDenied && (
              <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                <div className="font-semibold">Microphone access denied</div>
                <p className="mt-1 text-destructive/80">
                  Enable microphone access in your browser settings to start the roleplay.
                </p>
                <button
                  onClick={start}
                  className="mt-3 rounded-md bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground"
                >
                  Retry
                </button>
              </div>
            )}
            {connectFailed && !micDenied && (
              <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                Unable to start roleplay. Please try again.
                <div className="mt-2">
                  <button
                    onClick={start}
                    className="rounded-md bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={start}
                disabled={isLive}
                className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-card hover:opacity-90 disabled:opacity-60"
              >
                Start Roleplay
              </button>
              <button
                onClick={toggleMute}
                disabled={!isLive}
                className="rounded-md border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-foreground shadow-card hover:bg-secondary disabled:opacity-50"
              >
                {micMuted ? "Unmute Microphone" : "Mute Microphone"}
              </button>
              <button
                onClick={end}
                disabled={!isLive}
                className="rounded-md bg-destructive px-5 py-2.5 text-sm font-semibold text-destructive-foreground shadow-card hover:opacity-90 disabled:opacity-50"
              >
                End Call
              </button>
            </div>
          </div>
        </section>

        {/* RIGHT — Transcript */}
        <aside className="lg:col-span-3">
          <div className="flex h-full flex-col rounded-xl border border-border bg-surface p-5 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-foreground">Live Transcript</div>
                <div className="text-xs text-muted-foreground">Editable · POC</div>
              </div>
              <button
                onClick={() => setTranscriptText("")}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            </div>
            <textarea
              value={transcriptText}
              onChange={(e) => setTranscriptText(e.target.value)}
              placeholder="Transcript will appear here during the roleplay. Speaker labels: AI Customer, Trainee."
              className="mt-3 min-h-[380px] flex-1 resize-none overflow-auto rounded-md border border-input bg-background p-3 text-xs leading-relaxed text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="mt-3 flex flex-col gap-2">
              <button
                onClick={useDemo}
                className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
              >
                Use Demo Transcript
              </button>
              <button
                onClick={goEvaluate}
                disabled={!transcriptText.trim()}
                className="rounded-md bg-teal px-4 py-2 text-sm font-semibold text-teal-foreground shadow-card hover:opacity-90 disabled:opacity-50"
              >
                Generate Evaluation
              </button>
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
