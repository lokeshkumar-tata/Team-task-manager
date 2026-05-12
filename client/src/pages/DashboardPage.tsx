import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

type Summary = {
  totals: { todo: number; inProgress: number; done: number; overdue: number };
  overdueTasks: {
    id: string;
    title: string;
    dueDate: string | null;
    status: string;
    project: { id: string; name: string };
    assignee: { id: string; name: string } | null;
  }[];
  projects: {
    id: string;
    name: string;
    taskCounts: { todo: number; inProgress: number; done: number };
    overdueCount: number;
  }[];
};

export function DashboardPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api<Summary>("/api/dashboard/summary");
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
        {error}
      </div>
    );
  }

  if (!data) {
    return <p className="text-slate-600 dark:text-slate-400">Loading dashboard…</p>;
  }

  const { totals } = data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Overview of tasks across your projects.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="To do" value={totals.todo} tone="slate" />
        <StatCard label="In progress" value={totals.inProgress} tone="amber" />
        <StatCard label="Done" value={totals.done} tone="emerald" />
        <StatCard label="Overdue" value={totals.overdue} tone="rose" highlight={totals.overdue > 0} />
      </div>

      <section className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-lg shadow-indigo-500/5 backdrop-blur dark:border-white/10 dark:bg-slate-900/60">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Overdue tasks</h2>
        {data.overdueTasks.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">No overdue tasks. Nice work.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100 dark:divide-white/10">
            {data.overdueTasks.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0">
                <div>
                  <Link
                    to={`/projects/${t.project.id}`}
                    className="font-medium text-slate-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"
                  >
                    {t.title}
                  </Link>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t.project.name}
                    {t.assignee ? ` · ${t.assignee.name}` : ""}
                  </p>
                </div>
                <span className="font-mono text-xs text-rose-600 dark:text-rose-400">
                  {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-lg shadow-indigo-500/5 backdrop-blur dark:border-white/10 dark:bg-slate-900/60">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Projects</h2>
        {data.projects.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
            You are not in any project yet.{" "}
            <Link to="/projects" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
              Create one
            </Link>
            .
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 dark:border-white/10 dark:text-slate-400">
                  <th className="pb-2 pr-4 font-medium">Project</th>
                  <th className="pb-2 pr-4 font-medium">To do</th>
                  <th className="pb-2 pr-4 font-medium">In progress</th>
                  <th className="pb-2 pr-4 font-medium">Done</th>
                  <th className="pb-2 font-medium">Overdue</th>
                </tr>
              </thead>
              <tbody>
                {data.projects.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 dark:border-white/5">
                    <td className="py-3 pr-4">
                      <Link
                        to={`/projects/${p.id}`}
                        className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-slate-700 dark:text-slate-300">{p.taskCounts.todo}</td>
                    <td className="py-3 pr-4 text-slate-700 dark:text-slate-300">
                      {p.taskCounts.inProgress}
                    </td>
                    <td className="py-3 pr-4 text-slate-700 dark:text-slate-300">{p.taskCounts.done}</td>
                    <td className="py-3">
                      {p.overdueCount > 0 ? (
                        <span className="text-rose-600 dark:text-rose-400">{p.overdueCount}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  highlight,
}: {
  label: string;
  value: number;
  tone: "slate" | "amber" | "emerald" | "rose";
  highlight?: boolean;
}) {
  const tones = {
    slate: "from-slate-50 to-slate-100/80 border-slate-200/80 dark:from-slate-800/80 dark:to-slate-900/60 dark:border-white/10",
    amber:
      "from-amber-50 to-amber-100/80 border-amber-200/80 dark:from-amber-950/40 dark:to-amber-900/20 dark:border-amber-900/40",
    emerald:
      "from-emerald-50 to-emerald-100/80 border-emerald-200/80 dark:from-emerald-950/40 dark:to-emerald-900/20 dark:border-emerald-900/40",
    rose:
      "from-rose-50 to-rose-100/80 border-rose-200/80 dark:from-rose-950/40 dark:to-rose-900/20 dark:border-rose-900/40",
  };
  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br p-5 shadow-sm ${tones[tone]} ${
        highlight ? "ring-2 ring-rose-400/50" : ""
      }`}
    >
      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}
