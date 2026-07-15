import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { trainees, dashboardMetrics } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Trainer Dashboard · KGIS Sales Training AI" },
      { name: "description", content: "AI-powered roleplay, coaching and sales readiness evaluation for KGIS telecom sales agents." },
      { property: "og:title", content: "KGIS Sales Training AI" },
      { property: "og:description", content: "AI-powered roleplay, coaching and sales readiness evaluation." },
    ],
  }),
  component: Dashboard,
});

function Metric({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function ReadinessBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    "Production Ready": "bg-[color-mix(in_oklab,var(--success)_15%,transparent)] text-[color-mix(in_oklab,var(--success)_60%,black)]",
    "Coaching": "bg-teal-soft text-teal",
    "Needs Practice": "bg-[color-mix(in_oklab,var(--warning)_20%,transparent)] text-[color-mix(in_oklab,var(--warning)_50%,black)]",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[level] ?? ""}`}>
      {level}
    </span>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">KGIS Sales Training AI</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AI-powered roleplay, coaching and sales readiness evaluation
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Active Trainees" value={dashboardMetrics.activeTrainees} sub="Across 3 batches" />
        <Metric label="Roleplays Completed" value={dashboardMetrics.roleplaysCompleted} sub="Last 30 days" />
        <Metric label="Average Score" value={`${dashboardMetrics.averageScore}%`} sub="+4% vs last cycle" />
        <Metric label="Production Ready" value={dashboardMetrics.productionReady} sub="Certified this month" />
      </div>

      <div className="mt-10 rounded-xl border border-border bg-surface shadow-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Trainees</h2>
            <p className="text-xs text-muted-foreground">Track progression and launch a live roleplay</p>
          </div>
          <Link
            to="/scenarios"
            className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
          >
            Browse scenarios
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Batch</th>
                <th className="px-6 py-3 font-medium">Last Scenario</th>
                <th className="px-6 py-3 font-medium">Score</th>
                <th className="px-6 py-3 font-medium">Readiness</th>
                <th className="px-6 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {trainees.map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-6 py-3 font-medium text-foreground">{t.name}</td>
                  <td className="px-6 py-3 text-muted-foreground">{t.batch}</td>
                  <td className="px-6 py-3 text-muted-foreground">{t.lastScenario}</td>
                  <td className="px-6 py-3">
                    <span className="font-semibold text-foreground">{t.score}</span>
                    <span className="text-muted-foreground">/100</span>
                  </td>
                  <td className="px-6 py-3"><ReadinessBadge level={t.readiness} /></td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => navigate({ to: "/roleplay", search: { trainee: t.id } as never })}
                      className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
                    >
                      Start Roleplay
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
