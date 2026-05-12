const TOKEN_KEY = "ttm_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function api<T>(
  path: string,
  options: RequestInit & { json?: unknown } = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.json !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(path, {
    ...options,
    headers,
    body: options.json !== undefined ? JSON.stringify(options.json) : options.body,
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};

  if (!res.ok) {
    const msg =
      typeof data.error === "string"
        ? data.error
        : data.error?.fieldErrors
          ? JSON.stringify(data.error)
          : res.statusText;
    throw new Error(msg || `Request failed (${res.status})`);
  }

  return data as T;
}

export type User = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};

export type ProjectSummary = {
  id: string;
  name: string;
  description: string | null;
  role: "ADMIN" | "MEMBER";
  taskCount: number;
  createdAt: string;
};

export type TaskItem = {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  dueDate: string | null;
  assignee: { id: string; name: string; email: string } | null;
  creator: { id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
};
