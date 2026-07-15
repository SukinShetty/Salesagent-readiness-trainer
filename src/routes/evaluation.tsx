import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { mockEvaluation } from "@/lib/mock-data";

export const Route = createFileRoute("/evaluation")({
  head: () => ({
    meta: [
      { title: "Evaluation Report · KGIS Sales Training AI" },
      { name: "description", content: "AI-generated sales roleplay evaluation and coaching feedback." },
    ],
  }),
  component: Evaluation,
});

function ScoreBar({ value }: { value: number }) {
  const color =
    value >= 85 ? "var(--success)" : value >= 70 ? "var(--teal)" : value >= 60 ? "var(--warning)" : "var(--destructive)";
  return (
    <div className="h-2 w-full rounded-full bg-secondary">
      <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
    </div>
  );
}

function Evaluation() {
  const [trainee, setTrainee] = useState("Marcus Johnson");
  const [scenario, setScenario] = useState("Price-Sensitive Customer");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = window.sessionStorage.getItem("kgis:lastTrainee");
    const s = window.sessionStorage.getItem("kgis:lastScenario");
    if (t) setTrainee(t);
    if (s) setScenario(s);
  }, []);

  const e = mockEvaluation;

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Evaluation Report</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {trainee} · {scenario}
          </p>
        </div>
        <Link to="/roleplay" className="rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary">
          Back to Roleplay
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-gradient-to-br from-primary to-[color-mix(in_oklab,var(--primary)_70%,var(--teal))] p-6 text-primary-foreground shadow-elevated">
          <div className="text-xs font-medium uppercase tracking-wide opacity-80">Overall Score</div>
          <div className="mt-2 text-5xl font-semibold tracking-tight">{e.overallScore}</div>
          <div className="mt-1 text-xs opacity-80">out of 100</div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Readiness Level</div>
          <div className="mt-2 text-2xl font-semibold text-foreground">{e.readiness}</div>
          <div className="mt-1 text-xs text-muted-foreground">Based on 7 competency areas</div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Certification Decision</div>
          <div className="mt-2 text-2xl font-semibold text-teal">{e.certification}</div>
          <div className="mt-1 text-xs text-muted-foreground">Requires 1 additional roleplay to certify</div>
        </div>
      </div>

      {/* Categories */}
      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-border bg-surface p-6 shadow-card">
          <h2 className="text-base font-semibold text-foreground">Category Scores</h2>
          <div className="mt-5 space-y-4">
            {e.categories.map((c) => (
              <div key={c.name}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{c.name}</span>
                  <span className="font-semibold text-foreground">{c.score}</span>
                </div>
                <div className="mt-1.5"><ScoreBar value={c.score} /></div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
            <h3 className="text-sm font-semibold text-foreground">Recommended Next Scenario</h3>
            <div className="mt-2 rounded-lg bg-teal-soft p-4">
              <div className="text-base font-semibold text-teal">{e.nextScenario}</div>
              <div className="mt-1 text-xs text-muted-foreground">Targets objection handling gap</div>
            </div>
            <Link
              to="/roleplay"
              className="mt-4 block w-full rounded-md bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Assign Roleplay
            </Link>
          </div>
        </div>
      </div>

      {/* Strengths / Missed / Coaching */}
      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <h3 className="text-sm font-semibold text-foreground">Strengths</h3>
          <ul className="mt-3 space-y-2 text-sm text-foreground">
            {e.strengths.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--success)]" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <h3 className="text-sm font-semibold text-foreground">Missed Expectations</h3>
          <ul className="mt-3 space-y-2 text-sm text-foreground">
            {e.missed.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--warning)]" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <h3 className="text-sm font-semibold text-foreground">Coaching Feedback</h3>
          <ul className="mt-3 space-y-2 text-sm text-foreground">
            {e.coaching.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
