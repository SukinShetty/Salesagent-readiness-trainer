import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ConversationProvider,
  useConversationControls,
  useConversationInput,
  useConversationMode,
  useConversationStatus,
} from "@elevenlabs/react";
import { AppShell } from "@/components/AppShell";
import {
  DEMO_TRANSCRIPT,
  SUB_OPTIONS,
  evaluateTranscript,
  getScenarioBrief,
  loadSession,
  saveEvaluation,
  saveTranscript,
  type TrainingSession,
} from "@/lib/session";

const AGENT_ID = "agent_6801kxj68508fhdb7p2hzrqbrerw";

export const Route = createFileRoute("/roleplay")({
  head: () => ({
    meta: [
      { title: "Live Roleplay · KGIS Sales Training AI" },
      {
        name: "description",
        content: "Native voice roleplay with the AI telecom customer.",
      },
    ],
  }),
  component: LiveRoleplayPage,
});

type DisplayStatus =
  | "Ready"
  | "Connecting"
  | "Customer Listening"
  | "Customer Speaking"
  | "Reconnecting"
  | "Roleplay Completed"
  | "Connection Failed";

/** Safely format any error-like value from the SDK. */
function getSafeErrorMessage(error: unknown): string {
  try {
    if (!error) return "Unknown voice connection error";
    if (error instanceof Error) return error.message || "Unknown voice connection error";
    if (typeof error === "string") return error;
    if (typeof error === "object") {
      const v = error as Record<string, unknown>;
      return String(
        v.error_type ?? v.message ?? v.reason ?? v.type ?? "Unknown voice connection error",
      );
    }
    return String(error);
  } catch {
    return "Unknown voice connection error";
  }
}


function LiveRoleplayPage() {
  // Provider is mounted for the full lifetime of the route. Callbacks are
  // stable via the wrapping component's refs; we do NOT recreate the provider.
  return (
    <ConversationProvider
      onConnect={() => console.log("[Voice] connected")}
      onDisconnect={(details) => console.log("[Voice] disconnected", details)}
      onError={(error) => console.warn("[Voice] error:", getSafeErrorMessage(error), error)}
      onMessage={(message) => {
        // Simplified: log only. No nested property access, no assumptions.
        console.log("[Voice] message", message);
      }}
      onStatusChange={(s) => console.log("[Voice] status", s)}
      onModeChange={(m) => console.log("[Voice] mode", m)}
      onDebug={(d) => console.debug("[Voice] debug", d)}
    >
      <LiveRoleplay />
    </ConversationProvider>
  );
}

function LiveRoleplay() {
  const navigate = useNavigate();
  const controls = useConversationControls();
  const { status } = useConversationStatus();
  const { isSpeaking } = useConversationMode();
  const { isMuted, setMuted } = useConversationInput();

  const [session, setSession] = useState<TrainingSession | null>(null);
  const [transcriptText, setTranscriptText] = useState("");
  const [hasStarted, setHasStarted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const [connectFailed, setConnectFailed] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const startingRef = useRef(false);
  const connectedOnceRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);
  const fallbackTriedRef = useRef(false);

  useEffect(() => {
    setSession(loadSession());
  }, []);

  const brief = useMemo(
    () => getScenarioBrief(session?.scenario ?? "Price-Sensitive Customer"),
    [session?.scenario],
  );

  // Call duration ticker
  useEffect(() => {
    if (!startedAt || ended) return;
    const id = window.setInterval(() => {
      setDurationSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 500);
    return () => window.clearInterval(id);
  }, [startedAt, ended]);

  // Track connected status for fallback detection
  useEffect(() => {
    if (status === "connected") {
      connectedOnceRef.current = true;
      setIsReconnecting(false);
    }
  }, [status]);

  const startWith = useCallback(
    async (connectionType: "webrtc" | "websocket") => {
      // Minimum diagnostic session config — agent ID only.
      await controls.startSession({
        agentId: AGENT_ID,
        connectionType,
      });
      startedAtRef.current = Date.now();
      setStartedAt(Date.now());
    },
    [controls],
  );

  // Detect early unexpected disconnects and fall back to WebSocket once.
  useEffect(() => {
    if (status !== "disconnected") return;
    if (!hasStarted || ended) return;
    if (fallbackTriedRef.current) {
      setConnectFailed(true);
      return;
    }
    const startedAt = startedAtRef.current;
    const withinEarlyWindow = startedAt && Date.now() - startedAt < 10_000;
    // Fallback if we never fully connected OR we dropped within 10s of start.
    if (!connectedOnceRef.current || withinEarlyWindow) {
      fallbackTriedRef.current = true;
      setIsReconnecting(true);
      (async () => {
        try {
          await startWith("websocket");
        } catch (e) {
          console.warn("[Voice] websocket fallback failed:", getSafeErrorMessage(e));
          setConnectFailed(true);
          setIsReconnecting(false);
          setHasStarted(false);
        }
      })();
    } else {
      setEnded(true);
    }
  }, [status, hasStarted, ended, startWith]);

  const displayStatus: DisplayStatus = useMemo(() => {
    if (isReconnecting) return "Reconnecting";
    if (connectFailed) return "Connection Failed";
    if (!hasStarted) return "Ready";
    if (status === "connecting") return "Connecting";
    if (status === "connected") return isSpeaking ? "Customer Speaking" : "Customer Listening";
    if (ended || status === "disconnected") return "Roleplay Completed";
    return "Ready";
  }, [isReconnecting, connectFailed, hasStarted, status, isSpeaking, ended]);

  const start = useCallback(async () => {
    if (!session || startingRef.current) return;
    if (status === "connected" || status === "connecting") return;
    startingRef.current = true;
    setConnectFailed(false);
    setMicDenied(false);
    setEnded(false);
    connectedOnceRef.current = false;
    fallbackTriedRef.current = false;

    // Preflight
    if (typeof window === "undefined" || !window.isSecureContext) {
      console.warn("[Voice] page is not running over HTTPS; WebRTC may be blocked");
    }
    if (typeof RTCPeerConnection === "undefined") {
      // WebRTC unavailable — go straight to WebSocket.
      fallbackTriedRef.current = true;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Release the preflight stream; the SDK will open its own.
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      setMicDenied(true);
      startingRef.current = false;
      return;
    }

    setHasStarted(true);
    try {
      await startWith(fallbackTriedRef.current ? "websocket" : "webrtc");
    } catch (e) {
      console.warn("[Voice] startSession failed:", getSafeErrorMessage(e));
      setConnectFailed(true);
      setHasStarted(false);
    } finally {
      startingRef.current = false;
    }
  }, [session, status, startWith]);

  const end = useCallback(async () => {
    try {
      await controls.endSession();
    } catch {
      /* noop */
    }
    setEnded(true);
    setIsReconnecting(false);
  }, [controls]);

  const toggleMute = useCallback(() => {
    try {
      setMuted(!isMuted);
    } catch {
      /* noop */
    }
  }, [isMuted, setMuted]);

  const useDemo = () => {
    setTranscriptText(DEMO_TRANSCRIPT);
    setEnded(true);
  };

  // End session on route unmount
  useEffect(() => {
    return () => {
      try {
        void Promise.resolve(controls.endSession()).catch(() => {});
      } catch {
        /* noop */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateEvaluation = () => {
    if (!session) return;
    saveTranscript(transcriptText);
    const record = evaluateTranscript(transcriptText, session, durationSeconds);
    saveEvaluation(record);
    navigate({ to: "/evaluation" });
  };

  const statusStyles: Record<DisplayStatus, string> = {
    Ready: "bg-secondary text-secondary-foreground",
    Connecting: "bg-teal-soft text-teal",
    Reconnecting: "bg-teal-soft text-teal",
    "Customer Listening":
      "bg-[color-mix(in_oklab,var(--success)_18%,transparent)] text-[color-mix(in_oklab,var(--success)_60%,black)]",
    "Customer Speaking":
      "bg-[color-mix(in_oklab,var(--warning)_25%,transparent)] text-[color-mix(in_oklab,var(--warning)_50%,black)]",
    "Roleplay Completed": "bg-secondary text-secondary-foreground",
    "Connection Failed":
      "bg-[color-mix(in_oklab,var(--destructive)_20%,transparent)] text-destructive",
  };

  const isLive = status === "connected" || status === "connecting" || isReconnecting;
  const durationMMSS = formatDuration(durationSeconds);

  if (!session) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-card">
          <h1 className="text-xl font-semibold text-foreground">No active training session</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Start by configuring a trainee and scenario.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Go to Start Training
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Top session header */}
      <div className="mb-6 rounded-2xl border border-border bg-surface p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Trainee
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
              {session.salespersonName}
            </h1>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {session.employeeId} · {session.batchName}
            </div>
          </div>
          <div
            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[displayStatus]}`}
          >
            {displayStatus}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4 lg:grid-cols-7">
          <HeaderChip label="Project" value={session.project} />
          <HeaderChip label="Provider" value={session.provider} />
          <HeaderChip label="Core Training Module" value={session.coreModule} />
          <HeaderChip
            label={SUB_OPTIONS[session.coreModule]?.label ?? "Focus"}
            value={session.subOption}
          />
          <HeaderChip label="Scenario" value={session.scenario} />
          <HeaderChip label="Difficulty" value={session.difficulty} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* LEFT — Roleplay brief */}
        <aside className="space-y-4 lg:col-span-3">
          <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Roleplay Brief
            </div>
            <div className="mt-3 text-base font-semibold text-foreground">{brief.scenario}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{brief.personality}</div>

            <Section title="Customer Objective">
              <p className="text-sm text-foreground">{brief.customerObjective}</p>
            </Section>
            <Section title="Customer Profile">
              <BulletList items={brief.customerProfile} />
            </Section>
            <Section title="Trainee Objectives">
              <BulletList items={brief.traineeObjectives} />
            </Section>
            <Section title="Training Focus">
              <div className="flex flex-wrap gap-1.5">
                {brief.trainingFocus.map((f) => (
                  <span
                    key={f}
                    className="rounded-full bg-teal-soft px-2.5 py-0.5 text-[11px] font-medium text-teal"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </Section>
            <Section title="Expected Call Flow">
              <ol className="space-y-1 text-xs text-foreground">
                {brief.callFlowStages.map((s, i) => (
                  <li key={s} className="flex gap-2">
                    <span className="text-muted-foreground">{i + 1}.</span>
                    {s}
                  </li>
                ))}
              </ol>
            </Section>
          </div>
        </aside>

        {/* CENTER — AI Customer */}
        <section className="lg:col-span-6">
          <div className="rounded-2xl border border-border bg-gradient-to-br from-surface to-[color-mix(in_oklab,var(--teal-soft)_60%,var(--surface))] p-6 shadow-elevated">
            <div className="flex items-start gap-5">
              <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary text-2xl font-semibold text-primary-foreground shadow-elevated">
                {initials(brief.customerName)}
                {displayStatus === "Customer Listening" && (
                  <span className="pointer-events-none absolute inset-0 rounded-2xl ring-4 ring-teal/40 animate-pulse" />
                )}
              </div>
              <div className="flex-1">
                <div className="text-xs font-medium uppercase tracking-wide text-teal">
                  AI Customer
                </div>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                  {brief.customerName}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{session.scenario}</p>
                <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-teal-soft px-3 py-1 text-xs font-medium text-teal">
                  Mood: {brief.mood}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Call Duration
                </div>
                <div className="mt-1 font-mono text-2xl font-semibold tracking-tight text-foreground">
                  {durationMMSS}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Mic: {isLive ? (isMuted ? "Muted" : "Live") : "Off"}
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
                <div className="font-semibold">Microphone access is required to begin the roleplay.</div>
                <p className="mt-1 text-destructive/80">
                  Enable microphone access in your browser and try again.
                </p>
                <button
                  onClick={start}
                  className="mt-3 rounded-md bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground"
                >
                  Retry Microphone Access
                </button>
              </div>
            )}
            {connectFailed && !micDenied && (
              <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                Unable to start the roleplay. Please try again.
                <div className="mt-2">
                  <button
                    onClick={() => {
                      fallbackTriedRef.current = false;
                      void start();
                    }}
                    className="rounded-md bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}
            {isReconnecting && (
              <div className="mt-4 rounded-lg border border-border bg-teal-soft/60 p-3 text-sm text-teal">
                Reconnecting roleplay…
              </div>
            )}

            {/* Controls */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={start}
                disabled={isLive || startingRef.current}
                className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-card hover:opacity-90 disabled:opacity-60"
              >
                Start Roleplay
              </button>
              <button
                onClick={toggleMute}
                disabled={!isLive}
                className="rounded-md border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-foreground shadow-card hover:bg-secondary disabled:opacity-50"
              >
                {isMuted ? "Unmute Microphone" : "Mute Microphone"}
              </button>
              <button
                onClick={end}
                disabled={!isLive}
                className="rounded-md bg-destructive px-5 py-2.5 text-sm font-semibold text-destructive-foreground shadow-card hover:opacity-90 disabled:opacity-50"
              >
                End Roleplay
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
                <div className="text-xs text-muted-foreground">Editable · Trainer can correct</div>
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
                onClick={end}
                disabled={!isLive}
                className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-50"
              >
                End Roleplay
              </button>
              <button
                onClick={generateEvaluation}
                disabled={!transcriptText.trim() || !ended}
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

function HeaderChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-xs font-medium text-foreground">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1 text-xs text-foreground">
      {items.map((it) => (
        <li key={it} className="flex gap-2">
          <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-teal" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
