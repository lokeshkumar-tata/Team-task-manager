import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type ProjectSummary } from "../api";

export function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    setError(null);
    try {
      const { projects: list } = await api<{ projects: ProjectSummary[] }>("/api/projects");
      setProjects(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await api("/api/projects", {
        method: "POST",
        json: { name, description: description || undefined },
      });
      setName("");
      setDescription("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create project");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Projects</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Create a project to collaborate with your team. You will be the admin.
        </p>
      </div>

      <form
        onSubmit={onCreate}
        className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-lg shadow-indigo-500/5 backdrop-blur dark:border-white/10 dark:bg-slate-900/60"
      >
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">New project</h2>
        {error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        )}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="pname" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Name
            </label>
            <input
              id="pname"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none ring-indigo-500/30 focus:ring-2 dark:border-white/15 dark:bg-slate-950 dark:text-white"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="pdesc" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Description (optional)
            </label>
            <textarea
              id="pdesc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none ring-indigo-500/30 focus:ring-2 dark:border-white/15 dark:bg-slate-950 dark:text-white"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={creating}
          className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700 disabled:opacity-60"
        >
          {creating ? "Creating…" : "Create project"}
        </button>
      </form>

      <section>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Your projects</h2>
        {loading ? (
          <p className="mt-3 text-slate-600 dark:text-slate-400">Loading…</p>
        ) : projects.length === 0 ? (
          <p className="mt-3 text-slate-600 dark:text-slate-400">No projects yet.</p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  to={`/projects/${p.id}`}
                  className="block rounded-2xl border border-white/60 bg-white/70 p-5 shadow-md transition hover:border-indigo-200 hover:shadow-lg dark:border-white/10 dark:bg-slate-900/60 dark:hover:border-indigo-500/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white">{p.name}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.role === "ADMIN"
                          ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      }`}
                    >
                      {p.role}
                    </span>
                  </div>
                  {p.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
                      {p.description}
                    </p>
                  )}
                  <p className="mt-3 text-xs text-slate-500 dark:text-slate-500">
                    {p.taskCount} task{p.taskCount === 1 ? "" : "s"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
