import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
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

type SessionState = "Ready" | "Connecting" | "Listening" | "Speaking" | "Completed";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "elevenlabs-convai": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & { "agent-id"?: string; variant?: string },
        HTMLElement
      >;
    }
  }
}

function LiveRoleplay() {
  const { trainee: traineeId, scenario: scenarioId } = Route.useSearch();
  const navigate = useNavigate();

  const trainee =
    trainees.find((t) => t.id === traineeId) ?? trainees[0];
  const scenario =
    scenarios.find((s) => s.id === scenarioId) ??
    scenarios.find((s) => s.id === "price-sensitive") ??
    scenarios[0];

  const [sessionState, setSessionState] = useState<SessionState>("Ready");
  const [transcriptText, setTranscriptText] = useState("");
  const widgetRef = useRef<HTMLElement | null>(null);

  // Listen to widget lifecycle events for visual state + transcript capture
  useEffect(() => {
    const el = widgetRef.current;
    if (!el) return;

    const appendLine = (who: "AI Customer" | "Trainee", text: string) => {
      if (!text) return;
      setTranscriptText((prev) => (prev ? `${prev}\n${who}: ${text}` : `${who}: ${text}`));
    };

    const onCall = () => setSessionState("Connecting");
    const onConnect = () => setSessionState("Listening");
    const onDisconnect = () => setSessionState("Completed");
    const onMessage = (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | { source?: string; message?: string; text?: string }
        | undefined;
      if (!detail) return;
      const text = detail.message ?? detail.text ?? "";
      if (detail.source === "user") appendLine("Trainee", text);
      else if (detail.source === "ai") appendLine("AI Customer", text);
    };
    const onModeChange = (e: Event) => {
      const detail = (e as CustomEvent).detail as { mode?: string } | undefined;
      if (detail?.mode === "speaking") setSessionState("Speaking");
      else if (detail?.mode === "listening") setSessionState("Listening");
    };

    el.addEventListener("elevenlabs-convai:call", onCall);
    el.addEventListener("elevenlabs-convai:connect", onConnect);
    el.addEventListener("elevenlabs-convai:disconnect", onDisconnect);
    el.addEventListener("elevenlabs-convai:message", onMessage);
    el.addEventListener("elevenlabs-convai:mode-change", onModeChange);

    return () => {
      el.removeEventListener("elevenlabs-convai:call", onCall);
      el.removeEventListener("elevenlabs-convai:connect", onConnect);
      el.removeEventListener("elevenlabs-convai:disconnect", onDisconnect);
      el.removeEventListener("elevenlabs-convai:message", onMessage);
      el.removeEventListener("elevenlabs-convai:mode-change", onModeChange);
    };
  }, []);

  const start = useCallback(async () => {
    setSessionState("Connecting");
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      /* user can still use widget button */
    }
    widgetRef.current?.dispatchEvent(
      new CustomEvent("elevenlabs-convai:call", { detail: { config: {} } }),
    );
  }, []);

  const end = useCallback(() => {
    widgetRef.current?.dispatchEvent(new CustomEvent("elevenlabs-convai:end"));
    setSessionState("Completed");
  }, []);

  const useDemo = () => {
    setTranscriptText(demoTranscript);
    setSessionState("Completed");
  };

  const goEvaluate = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("kgis:lastTranscript", transcriptText);
      window.sessionStorage.setItem("kgis:lastTrainee", trainee.name);
      window.sessionStorage.setItem("kgis:lastScenario", scenario.title);
    }
    navigate({ to: "/evaluation" });
  };

  const stateStyles: Record<SessionState, string> = {
    Ready: "bg-secondary text-secondary-foreground",
    Connecting: "bg-teal-soft text-teal",
    Listening: "bg-[color-mix(in_oklab,var(--success)_18%,transparent)] text-[color-mix(in_oklab,var(--success)_60%,black)]",
    Speaking: "bg-[color-mix(in_oklab,var(--warning)_25%,transparent)] text-[color-mix(in_oklab,var(--warning)_50%,black)]",
    Completed: "bg-secondary text-secondary-foreground",
  };

  const focusSkills = [
    "Discovery",
    "Product recommendation",
    "FBB pitch",
    "Objection handling",
    "Compliance",
    "Closing",
  ];

  return (
    <AppShell>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Live Roleplay</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time voice conversation with the AI customer
          </p>
        </div>
        <div className={`rounded-full px-3 py-1 text-xs font-semibold ${stateStyles[sessionState]}`}>
          {sessionState}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* LEFT — Session Information */}
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

        {/* CENTER — AI Customer + ElevenLabs widget */}
        <section className="lg:col-span-6">
          <div className="rounded-2xl border border-border bg-gradient-to-br from-surface to-[color-mix(in_oklab,var(--teal-soft)_60%,var(--surface))] p-6 shadow-elevated">
            <div className="flex items-start gap-5">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary text-2xl font-semibold text-primary-foreground shadow-elevated">
                RM
              </div>
              <div className="flex-1">
                <div className="text-xs font-medium uppercase tracking-wide text-teal">AI Customer</div>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                  Rachel Miller
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  US home customer · price-sensitive · works from home · family of four
                </p>
                <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-teal-soft px-3 py-1 text-xs font-medium text-teal">
                  Mood: Cautious but open
                </div>
              </div>
            </div>

            {/* Animated waveform placeholder */}
            <div className="mt-6 flex h-16 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface/60 px-6">
              {Array.from({ length: 28 }).map((_, i) => {
                const active = sessionState === "Listening" || sessionState === "Speaking";
                return (
                  <span
                    key={i}
                    className="waveform-bar"
                    style={{
                      animationDelay: `${i * 60}ms`,
                      animationPlayState: active ? "running" : "paused",
                      height: active ? undefined : "6px",
                      opacity: active ? undefined : 0.25,
                    }}
                  />
                );
              })}
            </div>

            {/* Embedded ElevenLabs widget (inline, not floating) */}
            <div className="mt-6 rounded-xl border border-border bg-surface p-4">
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                ElevenLabs Voice Agent
              </div>
              <div className="flex min-h-[280px] items-center justify-center">
                <elevenlabs-convai
                  ref={(el: HTMLElement | null) => {
                    widgetRef.current = el;
                  }}
                  agent-id={AGENT_ID}
                  variant="expanded"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={start}
                disabled={sessionState === "Connecting" || sessionState === "Listening" || sessionState === "Speaking"}
                className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-card hover:opacity-90 disabled:opacity-60"
              >
                Start Roleplay
              </button>
              <button
                onClick={end}
                className="rounded-md bg-destructive px-5 py-2.5 text-sm font-semibold text-destructive-foreground shadow-card hover:opacity-90"
              >
                End Roleplay
              </button>
            </div>
          </div>
        </section>

        {/* RIGHT — Live Transcript */}
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
