import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import {
  CORE_MODULES,
  DIFFICULTIES,
  PROJECTS,
  PROVIDERS,
  SCENARIOS,
  SUB_OPTIONS,
  clearSessionEvaluationData,
  getClientSessionId,
  saveDbSessionId,
  saveSession,
  type CoreModule,
  type TrainingSession,
} from "@/lib/session";
import { createRoleplaySession } from "@/lib/roleplay-sessions.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Start Training · KGIS Sales Training AI" },
      {
        name: "description",
        content:
          "Begin an AI-powered sales roleplay for US telecom call handling — configure the trainee, project, module and scenario.",
      },
      { property: "og:title", content: "KGIS Sales Training AI" },
      {
        property: "og:description",
        content:
          "AI-powered call flow practice, customer roleplay, coaching and readiness evaluation.",
      },
    ],
  }),
  component: StartTraining,
});

type FormState = TrainingSession;

const DEFAULT_MODULE: CoreModule = "Full Call Flow Coaching Module";

const initial: FormState = {
  salespersonName: "",
  employeeId: "",
  batchName: "",
  project: PROJECTS[0],
  provider: PROVIDERS[0],
  coreModule: DEFAULT_MODULE,
  subOption: SUB_OPTIONS[DEFAULT_MODULE].options[0],
  scenario: SCENARIOS[0],
  difficulty: DIFFICULTIES[1],
};

function StartTraining() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(initial);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const createSession = useServerFn(createRoleplaySession);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const subConfig = useMemo(() => SUB_OPTIONS[form.coreModule], [form.coreModule]);

  const onCoreModuleChange = (value: CoreModule) => {
    const cfg = SUB_OPTIONS[value];
    setForm((f) => ({ ...f, coreModule: value, subOption: cfg.options[0] }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !form.salespersonName.trim() ||
      !form.employeeId.trim() ||
      !form.batchName.trim()
    ) {
      setError("Trainee Name, Trainee ID and Batch Name are required.");
      return;
    }
    if (!consent) {
      setError("Recording consent is required to begin the roleplay.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const result = await createSession({
        data: {
          clientSessionId: getClientSessionId(),
          traineeName: form.salespersonName,
          traineeId: form.employeeId,
          batch: form.batchName,
          project: form.project,
          provider: form.provider,
          coreModule: form.coreModule,
          subOption: form.subOption,
          scenario: form.scenario,
          difficulty: form.difficulty,
          consentGiven: true,
        },
      });
      saveSession(form);
      saveDbSessionId(result.sessionId);
      navigate({ to: "/roleplay" });
    } catch (err) {
      setError(
        err instanceof Error
          ? `Could not start session: ${err.message}`
          : "Could not start session.",
      );
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Start Sales Roleplay
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure the trainee and scenario, then begin a live AI voice roleplay.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="rounded-2xl border border-border bg-surface p-6 shadow-card"
      >
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Trainee Details
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Trainee Name" required>
              <input
                type="text"
                value={form.salespersonName}
                onChange={(e) => update("salespersonName", e.target.value)}
                maxLength={100}
                className={inputCls}
                placeholder="e.g. Aditi Sharma"
              />
            </Field>
            <Field label="Trainee ID" required>
              <input
                type="text"
                value={form.employeeId}
                onChange={(e) => update("employeeId", e.target.value)}
                maxLength={40}
                className={inputCls}
                placeholder="e.g. KGIS-1042"
              />
            </Field>
            <Field label="Batch Name" required>
              <input
                type="text"
                value={form.batchName}
                onChange={(e) => update("batchName", e.target.value)}
                maxLength={40}
                className={inputCls}
                placeholder="e.g. Batch A-14"
              />
            </Field>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Project Configuration
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Project">
              <Select
                value={form.project}
                onChange={(v) => update("project", v)}
                options={PROJECTS as readonly string[]}
              />
            </Field>
            <Field label="Telecom Provider">
              <Select
                value={form.provider}
                onChange={(v) => update("provider", v)}
                options={PROVIDERS as readonly string[]}
              />
            </Field>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Core Training Module
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Core Training Module">
              <Select
                value={form.coreModule}
                onChange={(v) => onCoreModuleChange(v as CoreModule)}
                options={CORE_MODULES as readonly string[]}
              />
            </Field>
            <Field label={subConfig.label}>
              <Select
                value={form.subOption}
                onChange={(v) => update("subOption", v)}
                options={subConfig.options}
              />
            </Field>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Scenario Configuration
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Customer Scenario">
              <Select
                value={form.scenario}
                onChange={(v) => update("scenario", v)}
                options={SCENARIOS as readonly string[]}
              />
            </Field>
            <Field label="Difficulty Level">
              <Select
                value={form.difficulty}
                onChange={(v) => update("difficulty", v)}
                options={DIFFICULTIES as readonly string[]}
              />
            </Field>
          </div>
        </section>

        {/* Recording consent gate */}
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Recording &amp; Consent
          </h2>
          <div className="mt-3 rounded-xl border border-border bg-background p-4 text-sm text-foreground">
            <p>
              This simulated training call will be recorded and analysed for
              coaching and assessment purposes.
            </p>
            <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1 h-4 w-4 accent-[var(--primary)]"
              />
              <span>I understand and consent to this training recording.</span>
            </label>
          </div>
        </section>

        {error && (
          <div className="mt-6 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="mt-8 flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={!consent || submitting}
            className="rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-card hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Preparing…" : "Begin Roleplay"}
          </button>
        </div>
      </form>
    </AppShell>
  );
}

const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </span>
      {children}
    </label>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputCls}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}
