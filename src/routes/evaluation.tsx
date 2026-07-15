import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  loadLastEvaluation,
  type EvaluationRecord,
  type ReadinessBand,
} from "@/lib/session";

export const Route = createFileRoute("/evaluation")({
  head: () => ({
    meta: [
      { title: "Evaluation Report · KGIS Sales Training AI" },
      {
        name: "description",
        content: "QMF-style sales roleplay evaluation with coaching feedback and readiness status.",
      },
    ],
  }),
  component: EvaluationPage,
});

function EvaluationPage() {
  const [record, setRecord] = useState<EvaluationRecord | null>(null);
  useEffect(() => setRecord(loadLastEvaluation()), []);
  const navigate = useNavigate();

  if (!record) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-card">
          <h1 className="text-xl font-semibold text-foreground">No evaluation available</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Complete a roleplay and generate an evaluation to see the report.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Start Training
          </Link>
        </div>
      </AppShell>
    );
  }

  const s = record.session;

  const download = () => {
    const blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kgis-evaluation-${s.employeeId}-${record.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Evaluation Report
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {s.salespersonName} · {s.employeeId} · {s.scenario}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate({ to: "/roleplay" })}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
          >
            Practice Again
          </button>
          <Link
            to="/"
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
          >
            Start New Scenario
          </Link>
          <Link
            to="/trainer"
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
          >
            Return to Trainer View
          </Link>
          <button
            onClick={download}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Download Report
          </button>
        </div>
      </div>

      {/* Session summary */}
      <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4 lg:grid-cols-8">
        <SummaryChip label="Salesperson" value={s.salespersonName} />
        <SummaryChip label="Employee ID" value={s.employeeId} />
        <SummaryChip label="Department" value={s.department} />
        <SummaryChip label="Project" value={s.project} />
        <SummaryChip label="Provider" value={s.provider} />
        <SummaryChip label="Scenario" value={s.scenario} />
        <SummaryChip label="Training Mode" value={s.trainingMode} />
        <SummaryChip
          label="Date · Duration"
          value={`${new Date(record.date).toLocaleDateString()} · ${formatDuration(
            record.durationSeconds,
          )}`}
        />
      </div>

      {/* Score / readiness / certification */}
      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-gradient-to-br from-primary to-[color-mix(in_oklab,var(--primary)_70%,var(--teal))] p-6 text-primary-foreground shadow-elevated">
          <div className="text-xs font-medium uppercase tracking-wide opacity-80">Overall Score</div>
          <div className="mt-2 text-5xl font-semibold tracking-tight">{record.overallScore}</div>
          <div className="mt-1 text-xs opacity-80">out of 100</div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Readiness Status
          </div>
          <div className="mt-2 text-2xl font-semibold text-foreground">{record.readiness}</div>
          <div className="mt-1 text-xs text-muted-foreground">{readinessBlurb(record.readiness)}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Certification Recommendation
          </div>
          <div className="mt-2 text-2xl font-semibold text-teal">{record.certification}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Based on 7-category QMF scorecard
          </div>
        </div>
      </div>

      {/* Category scores */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card lg:col-span-2">
          <h2 className="text-base font-semibold text-foreground">Category Scores</h2>
          <div className="mt-5 space-y-4">
            {record.categories.map((c) => {
              const pct = (c.score / c.max) * 100;
              return (
                <div key={c.name}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{c.name}</span>
                    <span className="font-semibold text-foreground">
                      {c.score}
                      <span className="text-muted-foreground">/{c.max}</span>
                    </span>
                  </div>
                  <div className="mt-1.5"><ScoreBar value={pct} /></div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
            <h3 className="text-sm font-semibold text-foreground">Coaching Summary</h3>
            <p className="mt-3 text-sm leading-relaxed text-foreground">
              {record.coachingSummary}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
            <h3 className="text-sm font-semibold text-foreground">Recommended Next Scenario</h3>
            <div className="mt-2 rounded-lg bg-teal-soft p-4">
              <div className="text-base font-semibold text-teal">{record.nextScenario}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Targets the largest gap from this session
              </div>
            </div>
            <Link
              to="/"
              className="mt-4 block w-full rounded-md bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Configure Next Roleplay
            </Link>
          </div>
        </div>
      </div>

      {/* Coaching bullets */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <BulletCard title="Strengths Demonstrated" items={record.strengths} tone="success" />
        <BulletCard title="Missed Expectations" items={record.missed} tone="warning" />
        <BulletCard title="Suggested Improvement Actions" items={record.improvements} tone="teal" />
      </div>
    </AppShell>
  );
}

function readinessBlurb(r: ReadinessBand) {
  switch (r) {
    case "Production Ready":
      return "85+ — cleared for live customer calls";
    case "Needs Minor Coaching":
      return "70–84 — one targeted practice recommended";
    case "Needs More Practice":
      return "50–69 — additional coaching required";
    case "Not Ready":
      return "Below 50 — return to component practice";
  }
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 shadow-card">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-xs font-medium text-foreground">{value}</div>
    </div>
  );
}

function ScoreBar({ value }: { value: number }) {
  const color =
    value >= 85
      ? "var(--success)"
      : value >= 70
        ? "var(--teal)"
        : value >= 50
          ? "var(--warning)"
          : "var(--destructive)";
  return (
    <div className="h-2 w-full rounded-full bg-secondary">
      <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
    </div>
  );
}

function BulletCard({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "success" | "warning" | "teal";
}) {
  const dot =
    tone === "success" ? "bg-[var(--success)]" : tone === "warning" ? "bg-[var(--warning)]" : "bg-teal";
  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm text-foreground">
        {items.map((s, i) => (
          <li key={i} className="flex gap-2">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
