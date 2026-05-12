import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, type TaskItem } from "../api";
import { useAuth } from "../auth";

type MemberRow = {
  userId: string;
  role: "ADMIN" | "MEMBER";
  user: { id: string; name: string; email: string };
};

type ProjectDetail = {
  project: {
    id: string;
    name: string;
    description: string | null;
    createdAt: string;
    owner: { id: string; name: string; email: string };
    yourRole: "ADMIN" | "MEMBER";
    members: MemberRow[];
  };
};

const statuses: TaskItem["status"][] = ["TODO", "IN_PROGRESS", "DONE"];

export function ProjectPage() {
  const { projectId = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"tasks" | "team">("tasks");
  const [error, setError] = useState<string | null>(null);

  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [taskAssignee, setTaskAssignee] = useState<string>("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER">("MEMBER");

  const isAdmin = detail?.project.yourRole === "ADMIN";

  function canEditTaskRow(t: TaskItem): boolean {
    if (!user) return false;
    if (isAdmin) return true;
    if (t.creator.id === user.id) return true;
    if (t.assignee?.id === user.id) return true;
    return false;
  }

  function canDeleteTaskRow(t: TaskItem): boolean {
    if (!user) return false;
    if (isAdmin) return true;
    return t.creator.id === user.id;
  }

  const loadAll = useCallback(async () => {
    setError(null);
    try {
      const [p, t] = await Promise.all([
        api<ProjectDetail>(`/api/projects/${projectId}`),
        api<{ tasks: TaskItem[] }>(`/api/projects/${projectId}/tasks`),
      ]);
      setDetail(p);
      setTasks(t.tasks);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  async function onCreateTask(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const payload: Record<string, unknown> = {
      title: taskTitle,
      description: taskDesc || undefined,
    };
    if (taskDue) payload.dueDate = new Date(taskDue).toISOString();
    if (isAdmin && taskAssignee) payload.assigneeId = taskAssignee;

    try {
      await api(`/api/projects/${projectId}/tasks`, { method: "POST", json: payload });
      setTaskTitle("");
      setTaskDesc("");
      setTaskDue("");
      setTaskAssignee("");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create task");
    }
  }

  async function updateTask(taskId: string, patch: Record<string, unknown>) {
    setError(null);
    try {
      await api(`/api/projects/${projectId}/tasks/${taskId}`, { method: "PATCH", json: patch });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function deleteTask(taskId: string) {
    if (!confirm("Delete this task?")) return;
    setError(null);
    try {
      await api(`/api/projects/${projectId}/tasks/${taskId}`, { method: "DELETE" });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function onInvite(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api(`/api/projects/${projectId}/members`, {
        method: "POST",
        json: { email: inviteEmail, role: inviteRole },
      });
      setInviteEmail("");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite failed");
    }
  }

  async function removeMember(userId: string) {
    if (!confirm("Remove this member from the project?")) return;
    setError(null);
    try {
      await api(`/api/projects/${projectId}/members/${userId}`, { method: "DELETE" });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed");
    }
  }

  async function changeRole(userId: string, role: "ADMIN" | "MEMBER") {
    setError(null);
    try {
      await api(`/api/projects/${projectId}/members/${userId}`, {
        method: "PATCH",
        json: { role },
      });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Role update failed");
    }
  }

  async function updateProject(e: FormEvent) {
    e.preventDefault();
    if (!detail) return;
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    const name = String(fd.get("pname") ?? "");
    const description = fd.get("pdesc") === "" ? null : String(fd.get("pdesc") ?? "");
    setError(null);
    try {
      await api(`/api/projects/${projectId}`, {
        method: "PATCH",
        json: { name, description },
      });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function deleteProject() {
    if (!confirm("Delete this project and all its tasks? This cannot be undone.")) return;
    setError(null);
    try {
      await api(`/api/projects/${projectId}`, { method: "DELETE" });
      navigate("/projects");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const memberOptions = useMemo(() => {
    return detail?.project.members ?? [];
  }, [detail]);

  if (loading) return <p className="text-slate-600 dark:text-slate-400">Loading…</p>;
  if (error && !detail)
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
        {error}
      </div>
    );
  if (!detail) return null;

  const { project } = detail;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/projects" className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            ← All projects
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{project.name}</h1>
          {project.description && (
            <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-400">{project.description}</p>
          )}
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-500">
            Your role:{" "}
            <span className="font-medium text-slate-800 dark:text-slate-200">{project.yourRole}</span>
          </p>
        </div>
        {isAdmin && (
          <form onSubmit={updateProject} className="w-full max-w-md rounded-xl border border-white/60 bg-white/70 p-4 dark:border-white/10 dark:bg-slate-900/60">
            <p className="text-sm font-medium text-slate-900 dark:text-white">Project settings</p>
            <label className="mt-2 block text-xs text-slate-600 dark:text-slate-400" htmlFor="pname">
              Name
            </label>
            <input
              id="pname"
              name="pname"
              defaultValue={project.name}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-white/15 dark:bg-slate-950 dark:text-white"
            />
            <label className="mt-2 block text-xs text-slate-600 dark:text-slate-400" htmlFor="pdesc">
              Description
            </label>
            <textarea
              id="pdesc"
              name="pdesc"
              rows={2}
              defaultValue={project.description ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-white/15 dark:bg-slate-950 dark:text-white"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Save
              </button>
              <button
                type="button"
                onClick={deleteProject}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-950/40"
              >
                Delete project
              </button>
            </div>
          </form>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          {error}
        </div>
      )}

      <div className="flex gap-2 border-b border-slate-200 dark:border-white/10">
        <button
          type="button"
          onClick={() => setTab("tasks")}
          className={`border-b-2 px-3 py-2 text-sm font-medium ${
            tab === "tasks"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          Tasks
        </button>
        <button
          type="button"
          onClick={() => setTab("team")}
          className={`border-b-2 px-3 py-2 text-sm font-medium ${
            tab === "team"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          Team
        </button>
      </div>

      {tab === "tasks" && (
        <div className="space-y-6">
          <form
            onSubmit={onCreateTask}
            className="rounded-2xl border border-white/60 bg-white/70 p-6 dark:border-white/10 dark:bg-slate-900/60"
          >
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">New task</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm text-slate-700 dark:text-slate-300">Title</label>
                <input
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-slate-950 dark:text-white"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm text-slate-700 dark:text-slate-300">Description</label>
                <textarea
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-slate-950 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-700 dark:text-slate-300">Due date</label>
                <input
                  type="datetime-local"
                  value={taskDue}
                  onChange={(e) => setTaskDue(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-slate-950 dark:text-white"
                />
              </div>
              {isAdmin && (
                <div>
                  <label className="block text-sm text-slate-700 dark:text-slate-300">Assign to</label>
                  <select
                    value={taskAssignee}
                    onChange={(e) => setTaskAssignee(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="">Unassigned</option>
                    {memberOptions.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.user.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <button
              type="submit"
              className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Add task
            </button>
          </form>

          <div className="overflow-x-auto rounded-2xl border border-white/60 bg-white/70 dark:border-white/10 dark:bg-slate-900/60">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 dark:border-white/10 dark:bg-slate-800/50">
                <tr className="text-slate-600 dark:text-slate-400">
                  <th className="px-4 py-3 font-medium">Task</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Assignee</th>
                  <th className="px-4 py-3 font-medium">Due</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => {
                  const editable = canEditTaskRow(t);
                  const deletable = canDeleteTaskRow(t);
                  return (
                    <tr key={t.id} className="border-b border-slate-100 dark:border-white/5">
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium text-slate-900 dark:text-white">{t.title}</div>
                        {t.description && (
                          <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">{t.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <select
                          value={t.status}
                          disabled={!editable}
                          onChange={(e) =>
                            updateTask(t.id, { status: e.target.value as TaskItem["status"] })
                          }
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:bg-slate-950 dark:text-white"
                        >
                          {statuses.map((s) => (
                            <option key={s} value={s}>
                              {s.replaceAll("_", " ")}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 align-top text-slate-700 dark:text-slate-300">
                        {isAdmin ? (
                          <select
                            value={t.assignee?.id ?? ""}
                            onChange={(e) =>
                              updateTask(t.id, {
                                assigneeId: e.target.value === "" ? null : e.target.value,
                              })
                            }
                            className="max-w-[11rem] rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs dark:border-white/15 dark:bg-slate-950 dark:text-white"
                          >
                            <option value="">Unassigned</option>
                            {memberOptions.map((m) => (
                              <option key={m.userId} value={m.userId}>
                                {m.user.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span>{t.assignee?.name ?? "—"}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top font-mono text-xs text-slate-600 dark:text-slate-400">
                        {t.dueDate ? (
                          <input
                            type="datetime-local"
                            disabled={!editable}
                            defaultValue={toLocalInput(t.dueDate)}
                            onBlur={(e) => {
                              if (!editable) return;
                              const v = e.target.value;
                              if (!v) updateTask(t.id, { dueDate: null });
                              else updateTask(t.id, { dueDate: new Date(v).toISOString() });
                            }}
                            className="w-[11rem] rounded border border-slate-200 bg-white px-1 py-0.5 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:bg-slate-950"
                          />
                        ) : (
                          <input
                            type="datetime-local"
                            disabled={!editable}
                            onBlur={(e) => {
                              if (!editable) return;
                              const v = e.target.value;
                              if (v) updateTask(t.id, { dueDate: new Date(v).toISOString() });
                            }}
                            className="w-[11rem] rounded border border-dashed border-slate-300 bg-transparent px-1 py-0.5 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/20"
                          />
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-right">
                        {deletable ? (
                          <button
                            type="button"
                            onClick={() => deleteTask(t.id)}
                            className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                          >
                            Delete
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {tasks.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-slate-500">No tasks yet.</p>
            )}
          </div>
        </div>
      )}

      {tab === "team" && (
        <div className="space-y-6">
          {isAdmin && (
            <form
              onSubmit={onInvite}
              className="rounded-2xl border border-white/60 bg-white/70 p-6 dark:border-white/10 dark:bg-slate-900/60"
            >
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Invite member</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                User must already have an account. Enter their email.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="min-w-[200px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-slate-950 dark:text-white"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "ADMIN" | "MEMBER")}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-slate-950 dark:text-white"
                >
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Add to project
                </button>
              </div>
            </form>
          )}

          <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/70 dark:border-white/10 dark:bg-slate-900/60">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 dark:border-white/10 dark:bg-slate-800/50">
                <tr className="text-slate-600 dark:text-slate-400">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  {isAdmin && <th className="px-4 py-3 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {project.members.map((m) => (
                  <tr key={m.userId} className="border-b border-slate-100 dark:border-white/5">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{m.user.name}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{m.user.email}</td>
                    <td className="px-4 py-3">
                      {isAdmin && m.userId !== project.owner.id ? (
                        <select
                          value={m.role}
                          onChange={(e) => changeRole(m.userId, e.target.value as "ADMIN" | "MEMBER")}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs dark:border-white/15 dark:bg-slate-950 dark:text-white"
                        >
                          <option value="MEMBER">MEMBER</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      ) : (
                        <span className="text-slate-700 dark:text-slate-300">{m.role}</span>
                      )}
                      {m.userId === project.owner.id && (
                        <span className="ml-2 text-xs text-slate-500">(owner)</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        {m.userId !== project.owner.id ? (
                          <button
                            type="button"
                            onClick={() => removeMember(m.userId)}
                            className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                          >
                            Remove
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
