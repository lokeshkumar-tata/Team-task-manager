import type { MemberRole } from "@prisma/client";

export function isAdmin(role: MemberRole): boolean {
  return role === "ADMIN";
}

export function canManageProject(role: MemberRole): boolean {
  return isAdmin(role);
}

export function canDeleteTask(
  role: MemberRole,
  opts: { createdById: string; userId: string }
): boolean {
  if (isAdmin(role)) return true;
  return opts.createdById === opts.userId;
}

export function canEditTask(
  role: MemberRole,
  opts: {
    userId: string;
    createdById: string;
    assigneeId: string | null;
  }
): boolean {
  if (isAdmin(role)) return true;
  if (opts.createdById === opts.userId) return true;
  if (opts.assigneeId === opts.userId) return true;
  return false;
}
