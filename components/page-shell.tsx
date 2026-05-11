import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { AppNav } from "@/components/app-nav";

type PageShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  aside?: ReactNode;
};

export function PageShell({ title, description, children, aside }: PageShellProps) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_12%_8%,rgba(34,211,238,0.24),transparent_30%),radial-gradient(circle_at_82%_12%,rgba(168,85,247,0.20),transparent_32%),radial-gradient(circle_at_76%_86%,rgba(251,146,60,0.16),transparent_34%),linear-gradient(135deg,#f8fbff_0%,#eef4ff_42%,#f7f3ff_100%)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <header className="premium-enter premium-card flex flex-col gap-3 rounded-xl p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="premium-icon-glow flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-950 via-indigo-900 to-cyan-600 text-white shadow-[0_14px_38px_rgba(14,165,233,0.28)]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground">AI Agent Business Guardian</p>
              <h1 className="max-w-full break-words text-xl font-semibold leading-tight tracking-normal text-slate-950 [overflow-wrap:anywhere] sm:text-2xl">
                {title}
              </h1>
              <p className="mt-1 max-w-2xl break-words text-sm leading-5 text-muted-foreground">
                {description}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 lg:items-end">
            <AppNav />
            {aside}
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}
