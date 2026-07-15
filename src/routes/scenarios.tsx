import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { scenarios } from "@/lib/mock-data";

export const Route = createFileRoute("/scenarios")({
  head: () => ({
    meta: [
      { title: "Scenario Library · KGIS Sales Training AI" },
      { name: "description", content: "Curated roleplay scenarios covering price objections, skeptical buyers, and more." },
    ],
  }),
  component: ScenarioLibrary,
});

const diffStyles: Record<string, string> = {
  Beginner: "bg-[color-mix(in_oklab,var(--success)_15%,transparent)] text-[color-mix(in_oklab,var(--success)_60%,black)]",
  Intermediate: "bg-teal-soft text-teal",
  Advanced: "bg-[color-mix(in_oklab,var(--warning)_25%,transparent)] text-[color-mix(in_oklab,var(--warning)_50%,black)]",
};

function ScenarioLibrary() {
  const navigate = useNavigate();
  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Scenario Library</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a customer persona to run a live AI voice roleplay
        </p>
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {scenarios.map((s) => (
          <div key={s.id} className="flex flex-col rounded-xl border border-border bg-surface p-6 shadow-card transition-shadow hover:shadow-elevated">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold text-foreground">{s.title}</h3>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${diffStyles[s.difficulty]}`}>
                {s.difficulty}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>

            <div className="mt-5 space-y-3 text-sm">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Personality</div>
                <div className="mt-0.5 text-foreground">{s.personality}</div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Focus Skills</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {s.focusSkills.map((sk) => (
                    <span key={sk} className="rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Estimated Duration</div>
                <div className="mt-0.5 text-foreground">{s.duration}</div>
              </div>
            </div>

            <button
              onClick={() => navigate({ to: "/roleplay", search: { scenario: s.id } as never })}
              className="mt-6 w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Start Roleplay
            </button>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
