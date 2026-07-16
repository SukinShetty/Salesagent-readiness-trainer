import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  CORE_MODULES,
  DIFFICULTIES,
  PROJECTS,
  PROVIDERS,
  SCENARIOS,
  SUB_OPTIONS,
  loadHistory,
  saveSession,
  type CoreModule,
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
        content:
          "Assign trainee and batch roleplays, browse the scenario pool, and track roleplay attempts, completions, practice hours and readiness.",
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

const TRAINER_VIEW_STATE_KEY = "kgis:trainerViewState";

type TrainerViewState = {
  query: string;
  fProject: string;
  fProvider: string;
  fModule: string;
  fScenario: string;
  fReadiness: string;
  scrollY: number;
};

function readSavedTrainerState(): Partial<TrainerViewState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(TRAINER_VIEW_STATE_KEY);
    return raw ? (JSON.parse(raw) as Partial<TrainerViewState>) : {};
  } catch {
    return {};
  }
}

function TrainerView() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<EvaluationRecord[]>([]);
  const saved = typeof window !== "undefined" ? readSavedTrainerState() : {};
  const [query, setQuery] = useState(saved.query ?? "");
  const [fProject, setFProject] = useState(saved.fProject ?? "All");
  const [fProvider, setFProvider] = useState(saved.fProvider ?? "All");
  const [fModule, setFModule] = useState(saved.fModule ?? "All");
  const [fScenario, setFScenario] = useState(saved.fScenario ?? "All");
  const [fReadiness, setFReadiness] = useState(saved.fReadiness ?? "All");
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignMode, setAssignMode] = useState<"individual" | "batch" | "custom">(
    "individual",
  );

  useEffect(() => {
    setHistory(loadHistory());
    const s = readSavedTrainerState();
    if (typeof window !== "undefined" && typeof s.scrollY === "number") {
      requestAnimationFrame(() => window.scrollTo(0, s.scrollY ?? 0));
    }
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return history.filter((r) => {
      const s = r.session;
      if (
        q &&
        !s.salespersonName.toLowerCase().includes(q) &&
        !s.employeeId.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (fProject !== "All" && s.project !== fProject) return false;
      if (fProvider !== "All" && s.provider !== fProvider) return false;
      if (fModule !== "All" && s.coreModule !== fModule) return false;
      if (fScenario !== "All" && s.scenario !== fScenario) return false;
      if (fReadiness !== "All" && r.readiness !== fReadiness) return false;
      return true;
    });
  }, [history, query, fProject, fProvider, fModule, fScenario, fReadiness]);

  // Trainee activity roll-ups (derived from evaluation records).
  const activity = useMemo(() => {
    const byTrainee = new Map<
      string,
      {
        name: string;
        id: string;
        batch: string;
        attempts: number;
        completed: number;
        callsInitiated: number;
        practiceHours: number;
        latestReadiness: ReadinessBand;
        latestScore: number;
        latestRecord: EvaluationRecord | null;
        latestDate: number;
      }
    >();
    for (const r of history) {
      const s = r.session;
      const ts = new Date(r.date).getTime() || 0;
      const entry = byTrainee.get(s.employeeId) ?? {
        name: s.salespersonName,
        id: s.employeeId,
        batch: s.batchName,
        attempts: 0,
        completed: 0,
        callsInitiated: 0,
        practiceHours: 0,
        latestReadiness: r.readiness,
        latestScore: r.overallScore,
        latestRecord: null as EvaluationRecord | null,
        latestDate: -Infinity,
      };
      entry.attempts += 1;
      entry.callsInitiated += 1;
      entry.completed += (r.turns ?? 0) > 0 ? 1 : 1;
      entry.practiceHours += (r.durationSeconds ?? 0) / 3600;
      if (ts >= entry.latestDate) {
        entry.latestDate = ts;
        entry.latestReadiness = r.readiness;
        entry.latestScore = r.overallScore;
        entry.latestRecord = r;
      }
      byTrainee.set(s.employeeId, entry);
    }
    return Array.from(byTrainee.values());
  }, [history]);

  const persistViewState = () => {
    if (typeof window === "undefined") return;
    const state: TrainerViewState = {
      query,
      fProject,
      fProvider,
      fModule,
      fScenario,
      fReadiness,
      scrollY: window.scrollY,
    };
    window.sessionStorage.setItem(TRAINER_VIEW_STATE_KEY, JSON.stringify(state));
  };

  const openReport = (r: EvaluationRecord) => {
    persistViewState();
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("kgis:lastEvaluation", JSON.stringify(r));
    }
    navigate({ to: "/evaluation" });
  };

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Trainer View
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Assign roleplays, browse the scenario pool, and track trainee activity and readiness.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setAssignMode("individual");
              setAssignOpen(true);
            }}
            className="rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-card hover:opacity-90"
          >
            Assign to Individual Trainee
          </button>
          <button
            onClick={() => {
              setAssignMode("batch");
              setAssignOpen(true);
            }}
            className="rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary"
          >
            Assign to Batch
          </button>
          <button
            onClick={() => {
              setAssignMode("custom");
              setAssignOpen(true);
            }}
            className="rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary"
          >
            Create Custom Scenario
          </button>
        </div>
      </div>

      {/* Scenario Pool */}
      <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">General Scenario Pool</h2>
            <p className="text-xs text-muted-foreground">
              Standard scenarios trainers can assign from.
            </p>
          </div>
          <div className="text-xs text-muted-foreground">{SCENARIOS.length} scenarios</div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {SCENARIOS.map((s) => (
            <span
              key={s}
              className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground"
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Search + filters */}
      <div className="mt-5 rounded-xl border border-border bg-surface p-4 shadow-card">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[220px] flex-1">
            <span className="mb-1 block text-xs font-medium text-foreground">
              Search trainee (name or trainee ID)
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
            label="Core Training Module"
            value={fModule}
            onChange={setFModule}
            options={["All", ...CORE_MODULES]}
          />
          <FilterSelect
            label="Scenario"
            value={fScenario}
            onChange={setFScenario}
            options={["All", ...SCENARIOS]}
          />
          <FilterSelect
            label="Production Readiness"
            value={fReadiness}
            onChange={setFReadiness}
            options={["All", ...READINESS]}
          />
        </div>
      </div>

      {/* Trainee activity */}
      <div className="mt-5 rounded-xl border border-border bg-surface shadow-card">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-foreground">Trainee Activity</h2>
          <p className="text-xs text-muted-foreground">
            Roleplay attempts, completed roleplays, calls initiated, practice hours and readiness.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-6 py-3 font-medium">Trainee</th>
                <th className="px-6 py-3 font-medium">Batch</th>
                <th className="px-6 py-3 font-medium">Attempts</th>
                <th className="px-6 py-3 font-medium">Completed</th>
                <th className="px-6 py-3 font-medium">Calls Initiated</th>
                <th className="px-6 py-3 font-medium">Practice Hours</th>
                <th className="px-6 py-3 font-medium">Latest Score</th>
                <th className="px-6 py-3 font-medium">Production Readiness</th>
              </tr>
            </thead>
            <tbody>
              {activity.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-sm text-muted-foreground">
                    No trainee activity yet.
                  </td>
                </tr>
              )}
              {activity.map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-6 py-3 font-medium text-foreground">
                    {t.name}
                    <div className="text-xs text-muted-foreground">{t.id}</div>
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">{t.batch}</td>
                  <td className="px-6 py-3 text-foreground">{t.attempts}</td>
                  <td className="px-6 py-3 text-foreground">{t.completed}</td>
                  <td className="px-6 py-3 text-foreground">{t.callsInitiated}</td>
                  <td className="px-6 py-3 text-foreground">{t.practiceHours.toFixed(1)}</td>
                  <td className="px-6 py-3 text-foreground">{t.latestScore}/100</td>
                  <td className="px-6 py-3">
                    <ReadinessBadge level={t.latestReadiness} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Roleplay attempts */}
      <div className="mt-5 rounded-xl border border-border bg-surface shadow-card">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-foreground">
            Roleplay Attempts &amp; Scenario Performance
          </h2>
          <p className="text-xs text-muted-foreground">
            {filtered.length} of {history.length} shown · Call-flow-stage and scenario performance visible in each report.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-6 py-3 font-medium">Trainee</th>
                <th className="px-6 py-3 font-medium">Trainee ID</th>
                <th className="px-6 py-3 font-medium">Project</th>
                <th className="px-6 py-3 font-medium">Core Module</th>
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
                  <td colSpan={9} className="px-6 py-8 text-center text-sm text-muted-foreground">
                    No roleplay attempts match the current filters.
                  </td>
                </tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-6 py-3 font-medium text-foreground">{r.session.salespersonName}</td>
                  <td className="px-6 py-3 text-muted-foreground">{r.session.employeeId}</td>
                  <td className="px-6 py-3 text-muted-foreground">{r.session.project}</td>
                  <td className="px-6 py-3 text-muted-foreground">{r.session.coreModule}</td>
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
          mode={assignMode}
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
  mode,
  onClose,
  onAssign,
}: {
  mode: "individual" | "batch" | "custom";
  onClose: () => void;
  onAssign: (s: TrainingSession) => void;
}) {
  const history = loadHistory();
  const knownTrainees = Array.from(
    new Map(history.map((r) => [r.session.employeeId, r.session])).values(),
  );
  const knownBatches = Array.from(new Set(knownTrainees.map((t) => t.batchName)));

  const firstTrainee = knownTrainees[0];
  const [traineeId, setTraineeId] = useState(firstTrainee?.employeeId ?? "");
  const [batchName, setBatchName] = useState(knownBatches[0] ?? "");
  const [customName, setCustomName] = useState("");
  const [customId, setCustomId] = useState("");
  const [customBatch, setCustomBatch] = useState("");
  const [project, setProject] = useState<string>(PROJECTS[0]);
  const [provider, setProvider] = useState<string>(PROVIDERS[0]);
  const [coreModule, setCoreModule] = useState<CoreModule>(
    "Full Call Flow Coaching Module",
  );
  const [subOption, setSubOption] = useState<string>(
    SUB_OPTIONS["Full Call Flow Coaching Module"].options[0],
  );
  const [scenario, setScenario] = useState<string>(SCENARIOS[0]);
  const [difficulty, setDifficulty] = useState<string>(DIFFICULTIES[1]);

  const onCoreChange = (v: CoreModule) => {
    setCoreModule(v);
    setSubOption(SUB_OPTIONS[v].options[0]);
  };

  const assign = () => {
    let name = "";
    let id = "";
    let batch = "";
    if (mode === "individual") {
      const t = knownTrainees.find((x) => x.employeeId === traineeId);
      if (!t) return;
      name = t.salespersonName;
      id = t.employeeId;
      batch = t.batchName;
    } else if (mode === "batch") {
      const t = knownTrainees.find((x) => x.batchName === batchName);
      name = t?.salespersonName ?? "Batch Trainee";
      id = t?.employeeId ?? "batch";
      batch = batchName;
    } else {
      name = customName.trim();
      id = customId.trim();
      batch = customBatch.trim();
      if (!name || !id || !batch) return;
    }
    onAssign({
      salespersonName: name,
      employeeId: id,
      batchName: batch,
      project,
      provider,
      coreModule,
      subOption,
      scenario,
      difficulty,
    });
  };

  const title =
    mode === "individual"
      ? "Assign to Individual Trainee"
      : mode === "batch"
        ? "Assign to Batch"
        : "Create Custom Scenario";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-elevated">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Configure the roleplay and open the Live Roleplay page.
            </p>
          </div>
          <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">
            Close
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          {mode === "individual" && (
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
          )}
          {mode === "batch" && (
            <ModalField label="Batch">
              <select
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                className={modalInput}
              >
                {knownBatches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </ModalField>
          )}
          {mode === "custom" && (
            <>
              <ModalField label="Trainee Name">
                <input
                  className={modalInput}
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
              </ModalField>
              <ModalField label="Trainee ID">
                <input
                  className={modalInput}
                  value={customId}
                  onChange={(e) => setCustomId(e.target.value)}
                />
              </ModalField>
              <ModalField label="Batch Name">
                <input
                  className={modalInput}
                  value={customBatch}
                  onChange={(e) => setCustomBatch(e.target.value)}
                />
              </ModalField>
            </>
          )}

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
          <ModalField label="Core Training Module">
            <select
              value={coreModule}
              onChange={(e) => onCoreChange(e.target.value as CoreModule)}
              className={modalInput}
            >
              {CORE_MODULES.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </ModalField>
          <ModalField label={SUB_OPTIONS[coreModule].label}>
            <select
              value={subOption}
              onChange={(e) => setSubOption(e.target.value)}
              className={modalInput}
            >
              {SUB_OPTIONS[coreModule].options.map((o) => (
                <option key={o}>{o}</option>
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
