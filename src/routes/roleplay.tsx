import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useConversation } from "@elevenlabs/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  component: LiveRoleplay,
});

type Line = { role: "agent" | "customer" | "system"; text: string; ts: number };

function LiveRoleplay() {
  const { trainee: traineeId, scenario: scenarioId } = Route.useSearch();
  const navigate = useNavigate();

  const trainee = trainees.find((t) => t.id === traineeId) ?? trainees[0];
  const scenario = scenarios.find((s) => s.id === scenarioId) ?? scenarios[0];

  const [transcript, setTranscript] = useState<Line[]>([]);
  const [transcriptText, setTranscriptText] = useState("");
  const [completed, setCompleted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const startedRef = useRef(false);

  const conversation = useConversation({
    onConnect: () => setErrorMsg(null),
    onDisconnect: () => {
      if (startedRef.current) setCompleted(true);
    },
    onMessage: (message: { source?: string; message?: string }) => {
      const role: Line["role"] =
        message.source === "user" ? "customer" : message.source === "ai" ? "agent" : "system";
      const text = message.message ?? "";
      if (!text) return;
      setTranscript((prev) => [...prev, { role, text, ts: Date.now() }]);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : typeof err === "string" ? err : "Voice connection error";
      setErrorMsg(msg);
    },
  });

  // Keep the editable text area in sync with captured transcript
  useEffect(() => {
    if (transcript.length === 0) return;
    const formatted = transcript
      .map((l) => {
        const who = l.role === "agent" ? "Agent (Trainee)" : l.role === "customer" ? "Customer (Rachel)" : "System";
        return `${who}: ${l.text}`;
      })
      .join("\n");
    setTranscriptText(formatted);
  }, [transcript]);

  const status = conversation.status; // 'disconnected' | 'connecting' | 'connected'
  const isSpeaking = conversation.isSpeaking;

  const displayStatus = useMemo(() => {
    if (completed && status !== "connected") return { label: "Completed", tone: "bg-secondary text-secondary-foreground" };
    if (status === "connecting") return { label: "Connecting", tone: "bg-teal-soft text-teal" };
    if (status === "connected" && isSpeaking) return { label: "Speaking", tone: "bg-[color-mix(in_oklab,var(--warning)_25%,transparent)] text-[color-mix(in_oklab,var(--warning)_50%,black)]" };
    if (status === "connected") return { label: "Listening", tone: "bg-[color-mix(in_oklab,var(--success)_18%,transparent)] text-[color-mix(in_oklab,var(--success)_60%,black)]" };
    return { label: "Ready", tone: "bg-secondary text-secondary-foreground" };
  }, [status, isSpeaking, completed]);

  const start = useCallback(async () => {
    setErrorMsg(null);
    setCompleted(false);
    setTranscript([]);
    setTranscriptText("");
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await conversation.startSession({
        agentId: AGENT_ID,
        connectionType: "webrtc",
      });
      startedRef.current = true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not start voice session";
      setErrorMsg(msg + " — you can still paste a transcript manually below.");
    }
  }, [conversation]);

  const end = useCallback(async () => {
    try {
      await conversation.endSession();
    } catch {
      /* noop */
    }
    setCompleted(true);
  }, [conversation]);

  const useDemo = () => {
    setTranscriptText(demoTranscript);
    setCompleted(true);
  };

  const goEvaluate = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("kgis:lastTranscript", transcriptText);
      window.sessionStorage.setItem("kgis:lastTrainee", trainee.name);
      window.sessionStorage.setItem("kgis:lastScenario", scenario.title);
    }
    navigate({ to: "/evaluation" });
  };

  return (
    <AppShell>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Live Roleplay</h1>
          <p className="mt-1 text-sm text-muted-foreground">Real-time voice conversation with the AI customer</p>
        </div>
        <div className={`rounded-full px-3 py-1 text-xs font-semibold ${displayStatus.tone}`}>
          {displayStatus.label}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left column: trainee + scenario */}
        <div className="space-y-4 lg:col-span-3">
          <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Trainee</div>
            <div className="mt-2 text-lg font-semibold text-foreground">{trainee.name}</div>
            <div className="text-xs text-muted-foreground">{trainee.batch}</div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Last score</span>
              <span className="font-semibold text-foreground">{trainee.score}/100</span>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Scenario</div>
            <div className="mt-2 text-lg font-semibold text-foreground">{scenario.title}</div>
            <div className="mt-1 text-xs text-muted-foreground">{scenario.difficulty} · {scenario.duration}</div>
            <p className="mt-3 text-sm text-muted-foreground">{scenario.description}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {scenario.focusSkills.map((sk) => (
                <span key={sk} className="rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{sk}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Center: AI Customer card */}
        <div className="lg:col-span-6">
          <div className="rounded-2xl border border-border bg-gradient-to-br from-surface to-[color-mix(in_oklab,var(--teal-soft)_60%,var(--surface))] p-8 shadow-elevated">
            <div className="flex items-start gap-5">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary text-2xl font-semibold text-primary-foreground shadow-elevated">
                RM
              </div>
              <div className="flex-1">
                <div className="text-xs font-medium uppercase tracking-wide text-teal">AI Customer</div>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Rachel Miller</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  US home customer · price-sensitive · works from home · family of four
                </p>
                <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-teal-soft px-3 py-1 text-xs font-medium text-teal">
                  Mood: Cautious but open
                </div>
              </div>
            </div>

            {/* Waveform */}
            <div className="mt-8 flex h-16 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface/60 px-6">
              {Array.from({ length: 28 }).map((_, i) => (
                <span
                  key={i}
                  className="waveform-bar"
                  style={{
                    animationDelay: `${i * 60}ms`,
                    animationPlayState: status === "connected" ? "running" : "paused",
                    height: status === "connected" ? undefined : "6px",
                    opacity: status === "connected" ? undefined : 0.25,
                  }}
                />
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {status !== "connected" ? (
                <button
                  onClick={start}
                  disabled={status === "connecting"}
                  className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-card hover:opacity-90 disabled:opacity-60"
                >
                  {status === "connecting" ? "Connecting…" : "Start Roleplay"}
                </button>
              ) : (
                <button
                  onClick={end}
                  className="rounded-md bg-destructive px-5 py-2.5 text-sm font-semibold text-destructive-foreground shadow-card hover:opacity-90"
                >
                  End Roleplay
                </button>
              )}
              <button
                onClick={useDemo}
                className="rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground hover:bg-secondary"
              >
                Use Demo Transcript
              </button>
              <button
                onClick={goEvaluate}
                disabled={!transcriptText.trim()}
                className="rounded-md bg-teal px-5 py-2.5 text-sm font-semibold text-teal-foreground shadow-card hover:opacity-90 disabled:opacity-50"
              >
                Generate Evaluation
              </button>
            </div>

            {errorMsg && (
              <div className="mt-4 rounded-md border border-destructive/30 bg-[color-mix(in_oklab,var(--destructive)_10%,transparent)] px-4 py-2 text-xs text-destructive">
                {errorMsg}
              </div>
            )}
          </div>
        </div>

        {/* Right: Transcript */}
        <div className="lg:col-span-3">
          <div className="flex h-full flex-col rounded-xl border border-border bg-surface p-5 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-foreground">Transcript</div>
                <div className="text-xs text-muted-foreground">Auto-captured · editable</div>
              </div>
              <button
                onClick={() => { setTranscript([]); setTranscriptText(""); }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            </div>
            <textarea
              value={transcriptText}
              onChange={(e) => setTranscriptText(e.target.value)}
              placeholder="Transcript will appear here during the roleplay. You can also paste one manually."
              className="mt-3 min-h-[420px] flex-1 resize-none rounded-md border border-input bg-background p-3 text-xs leading-relaxed text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
