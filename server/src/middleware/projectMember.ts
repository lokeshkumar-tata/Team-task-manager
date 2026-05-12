import type { Response, NextFunction } from "express";
import type { MemberRole } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { routeParam } from "../lib/routeParams.js";
import type { AuthedRequest } from "./auth.js";

export type ProjectMemberRequest = AuthedRequest & {
  projectId?: string;
  membership?: { role: MemberRole };
};

export async function loadProjectMember(
  req: ProjectMemberRequest,
  res: Response,
  next: NextFunction
) {
  const userId = req.userId;
  const projectId = routeParam(req.params.projectId ?? req.params.id);
  if (!userId || !projectId) {
    res.status(400).json({ error: "Missing project context" });
    return;
  }
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!membership) {
    res.status(403).json({ error: "You are not a member of this project" });
    return;
  }
  req.projectId = projectId;
  req.membership = membership;
  next();
}

export function requireProjectAdmin(
  req: ProjectMemberRequest,
  res: Response,
  next: NextFunction
) {
  if (req.membership?.role !== "ADMIN") {
    res.status(403).json({ error: "Admin role required" });
    return;
  }
  next();
}
