import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  DEPARTMENTS,
  DIFFICULTIES,
  PROJECTS,
  PROVIDERS,
  SCENARIOS,
  TELECOM_SERVICES,
  TRAINING_MODES,
  saveSession,
  type TrainingSession,
} from "@/lib/session";

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
        content: "AI-powered call flow practice, customer roleplay, coaching and readiness evaluation.",
      },
    ],
  }),
  component: StartTraining,
});

type FormState = TrainingSession;

const initial: FormState = {
  salespersonName: "",
  employeeId: "",
  department: DEPARTMENTS[0],
  batchName: "",
  project: PROJECTS[0],
  provider: PROVIDERS[0],
  telecomService: TELECOM_SERVICES[0],
  trainingMode: TRAINING_MODES[1].options[0], // Complete end-to-end sales call
  scenario: SCENARIOS[0],
  difficulty: DIFFICULTIES[1],
};

function StartTraining() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(initial);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.salespersonName.trim() || !form.employeeId.trim() || !form.batchName.trim()) {
      setError("Salesperson Name, Employee ID and Batch Name are required.");
      return;
    }
    setError(null);
    saveSession(form);
    navigate({ to: "/roleplay" });
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
            Trainee
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Salesperson Name" required>
              <input
                type="text"
                value={form.salespersonName}
                onChange={(e) => update("salespersonName", e.target.value)}
                maxLength={100}
                className={inputCls}
                placeholder="e.g. Aditi Sharma"
              />
            </Field>
            <Field label="Employee ID" required>
              <input
                type="text"
                value={form.employeeId}
                onChange={(e) => update("employeeId", e.target.value)}
                maxLength={40}
                className={inputCls}
                placeholder="e.g. KGIS-1042"
              />
            </Field>
            <Field label="Department">
              <Select
                value={form.department}
                onChange={(v) => update("department", v)}
                options={DEPARTMENTS as readonly string[]}
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
            Project &amp; Provider
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
            Training Module
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Training Mode">
              <select
                value={form.trainingMode}
                onChange={(e) => update("trainingMode", e.target.value)}
                className={inputCls}
              >
                {TRAINING_MODES.map((group) => (
                  <optgroup key={group.group} label={group.group}>
                    {group.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </Field>
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

        {error && (
          <div className="mt-6 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="mt-8 flex items-center justify-end gap-3">
          <button
            type="submit"
            className="rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-card hover:opacity-90"
          >
            Begin Roleplay
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
