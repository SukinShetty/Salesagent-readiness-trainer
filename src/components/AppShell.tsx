import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

const nav = [
  { to: "/", label: "Dashboard" },
  { to: "/scenarios", label: "Scenarios" },
  { to: "/roleplay", label: "Live Roleplay" },
  { to: "/evaluation", label: "Evaluation" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              K
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight text-foreground">KGIS Sales Training AI</div>
              <div className="text-xs text-muted-foreground">L&D Console · POC</div>
            </div>
          </Link>
          <nav className="flex items-center gap-1">
            {nav.map((item) => {
              const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden text-right md:block">
              <div className="text-xs font-medium text-foreground">L&D Lead</div>
              <div className="text-[11px] text-muted-foreground">KGIS Enterprise</div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-soft text-teal font-semibold">
              LD
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-6 py-8">{children}</main>
      <footer className="mx-auto max-w-[1400px] px-6 py-6 text-xs text-muted-foreground">
        © KGIS Sales Training AI · Confidential POC
      </footer>
    </div>
  );
}
