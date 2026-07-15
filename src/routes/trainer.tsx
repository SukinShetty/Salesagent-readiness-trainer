import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  DIFFICULTIES,
  PROJECTS,
  PROVIDERS,
  SCENARIOS,
  TRAINING_MODES,
  loadHistory,
  saveSession,
  type EvaluationRecord,
  type ReadinessBand,
  type TrainingSession,
} from "@/lib/session";

export const Route = createFileRoute("/trainer")({
  head: () => ({
    meta: [
      { title: "Trainer View · KGIS Sales Training AI" },
      {
        name: "description",
        content: "Search trainees, review recent roleplay attempts and assign new scenarios.",
      },
    ],
  }),
  component: TrainerView,
});

const READINESS: ReadinessBand[] = [
  "Production Ready",
  "Needs Minor Coaching",
  "Needs More Practice",
  "Not Ready",
];

function TrainerView() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<EvaluationRecord[]>([]);
  const [query, setQuery] = useState("");
  const [fProject, setFProject] = useState("All");
  const [fProvider, setFProvider] = useState("All");
  const [fMode, setFMode] = useState("All");
  const [fScenario, setFScenario] = useState("All");
  const [fReadiness, setFReadiness] = useState("All");
  const [assignOpen, setAssignOpen] = useState(false);

  useEffect(() => setHistory(loadHistory()), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return history.filter((r) => {
      const s = r.session;
      if (q && !s.salespersonName.toLowerCase().includes(q) && !s.employeeId.toLowerCase().includes(q)) {
        return false;
      }
      if (fProject !== "All" && s.project !== fProject) return false;
      if (fProvider !== "All" && s.provider !== fProvider) return false;
      if (fMode !== "All" && s.trainingMode !== fMode) return false;
      if (fScenario !== "All" && s.scenario !== fScenario) return false;
      if (fReadiness !== "All" && r.readiness !== fReadiness) return false;
      return true;
    });
  }, [history, query, fProject, fProvider, fMode, fScenario, fReadiness]);

  const openReport = (r: EvaluationRecord) => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("kgis:lastEvaluation", JSON.stringify(r));
    }
    navigate({ to: "/evaluation" });
  };

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Trainer View</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review recent roleplay attempts and assign new practice sessions.
          </p>
        </div>
        <button
          onClick={() => setAssignOpen(true)}
          className="rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-card hover:opacity-90"
        >
          Assign New Roleplay
        </button>
      </div>

      {/* Search + filters */}
      <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex-1 min-w-[220px]">
            <span className="mb-1 block text-xs font-medium text-foreground">
              Search trainee (name or employee ID)
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Aditi or KGIS-1042"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <FilterSelect label="Project" value={fProject} onChange={setFProject} options={["All", ...PROJECTS]} />
          <FilterSelect label="Provider" value={fProvider} onChange={setFProvider} options={["All", ...PROVIDERS]} />
          <FilterSelect
            label="Training Mode"
            value={fMode}
            onChange={setFMode}
            options={["All", ...TRAINING_MODES.flatMap((g) => g.options)]}
          />
          <FilterSelect label="Scenario" value={fScenario} onChange={setFScenario} options={["All", ...SCENARIOS]} />
          <FilterSelect label="Readiness" value={fReadiness} onChange={setFReadiness} options={["All", ...READINESS]} />
        </div>
      </div>

      {/* Table */}
      <div className="mt-5 rounded-xl border border-border bg-surface shadow-card">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-foreground">Recent Roleplay Attempts</h2>
          <p className="text-xs text-muted-foreground">
            {filtered.length} of {history.length} shown
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-6 py-3 font-medium">Trainee</th>
                <th className="px-6 py-3 font-medium">Employee ID</th>
                <th className="px-6 py-3 font-medium">Project</th>
                <th className="px-6 py-3 font-medium">Scenario</th>
                <th className="px-6 py-3 font-medium">Score</th>
                <th className="px-6 py-3 font-medium">Readiness</th>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-sm text-muted-foreground">
                    No roleplay attempts match the current filters.
                  </td>
                </tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-6 py-3 font-medium text-foreground">{r.session.salespersonName}</td>
                  <td className="px-6 py-3 text-muted-foreground">{r.session.employeeId}</td>
                  <td className="px-6 py-3 text-muted-foreground">{r.session.project}</td>
                  <td className="px-6 py-3 text-muted-foreground">{r.session.scenario}</td>
                  <td className="px-6 py-3">
                    <span className="font-semibold text-foreground">{r.overallScore}</span>
                    <span className="text-muted-foreground">/100</span>
                  </td>
                  <td className="px-6 py-3">
                    <ReadinessBadge level={r.readiness} />
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">
                    {new Date(r.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => openReport(r)}
                      className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
                    >
                      View Report
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {assignOpen && (
        <AssignModal
          onClose={() => setAssignOpen(false)}
          onAssign={(session) => {
            saveSession(session);
            setAssignOpen(false);
            navigate({ to: "/roleplay" });
          }}
        />
      )}
    </AppShell>
  );
}

function ReadinessBadge({ level }: { level: ReadinessBand }) {
  const styles: Record<ReadinessBand, string> = {
    "Production Ready":
      "bg-[color-mix(in_oklab,var(--success)_15%,transparent)] text-[color-mix(in_oklab,var(--success)_60%,black)]",
    "Needs Minor Coaching": "bg-teal-soft text-teal",
    "Needs More Practice":
      "bg-[color-mix(in_oklab,var(--warning)_20%,transparent)] text-[color-mix(in_oklab,var(--warning)_50%,black)]",
    "Not Ready":
      "bg-[color-mix(in_oklab,var(--destructive)_15%,transparent)] text-destructive",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[level]}`}>
      {level}
    </span>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function AssignModal({
  onClose,
  onAssign,
}: {
  onClose: () => void;
  onAssign: (s: TrainingSession) => void;
}) {
  const history = loadHistory();
  const knownTrainees = Array.from(
    new Map(history.map((r) => [r.session.employeeId, r.session])).values(),
  );

  const [traineeId, setTraineeId] = useState(knownTrainees[0]?.employeeId ?? "");
  const [project, setProject] = useState<string>(PROJECTS[0]);
  const [provider, setProvider] = useState<string>(PROVIDERS[0]);
  const [trainingMode, setTrainingMode] = useState<string>(TRAINING_MODES[1].options[0]);
  const [scenario, setScenario] = useState<string>(SCENARIOS[0]);
  const [difficulty, setDifficulty] = useState<string>(DIFFICULTIES[1]);

  const assign = () => {
    const t = knownTrainees.find((x) => x.employeeId === traineeId);
    if (!t) return;
    const session: TrainingSession = {
      salespersonName: t.salespersonName,
      employeeId: t.employeeId,
      department: t.department,
      batchName: t.batchName,
      project,
      provider,
      trainingMode,
      scenario,
      difficulty,
    };
    // Persist an "assigned" marker so it appears in history right away.
    const record: EvaluationRecord = {
      id: `assigned_${Date.now()}`,
      date: new Date().toISOString(),
      durationSeconds: 0,
      session,
      overallScore: 0,
      categories: [],
      readiness: "Not Ready",
      certification: "Not Certified",
      strengths: [],
      missed: [],
      improvements: [],
      coachingSummary: "Assigned — awaiting roleplay.",
      nextScenario: scenario,
    };
    // We don't want assigned-but-not-run rows to appear as attempts; skip saving.
    void record;
    onAssign(session);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-elevated">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Assign New Roleplay</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Select a trainee and configure the practice session.
            </p>
          </div>
          <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">
            Close
          </button>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <ModalField label="Trainee">
            <select
              value={traineeId}
              onChange={(e) => setTraineeId(e.target.value)}
              className={modalInput}
            >
              {knownTrainees.map((t) => (
                <option key={t.employeeId} value={t.employeeId}>
                  {t.salespersonName} · {t.employeeId}
                </option>
              ))}
            </select>
          </ModalField>
          <ModalField label="Project">
            <select value={project} onChange={(e) => setProject(e.target.value)} className={modalInput}>
              {PROJECTS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </ModalField>
          <ModalField label="Provider">
            <select value={provider} onChange={(e) => setProvider(e.target.value)} className={modalInput}>
              {PROVIDERS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </ModalField>
          <ModalField label="Training Mode">
            <select
              value={trainingMode}
              onChange={(e) => setTrainingMode(e.target.value)}
              className={modalInput}
            >
              {TRAINING_MODES.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.options.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </ModalField>
          <ModalField label="Scenario">
            <select value={scenario} onChange={(e) => setScenario(e.target.value)} className={modalInput}>
              {SCENARIOS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </ModalField>
          <ModalField label="Difficulty">
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className={modalInput}
            >
              {DIFFICULTIES.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </ModalField>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            onClick={assign}
            disabled={!traineeId}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            Assign &amp; Open Roleplay
          </button>
        </div>
      </div>
    </div>
  );
}

const modalInput =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}
