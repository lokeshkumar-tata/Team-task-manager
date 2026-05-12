import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { routeParam } from "../lib/routeParams.js";
import {
  loadProjectMember,
  requireProjectAdmin,
  type ProjectMemberRequest,
} from "../middleware/projectMember.js";

export const membersRouter = Router({ mergeParams: true });

const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

const patchMemberSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER"]),
});

membersRouter.use(loadProjectMember);

membersRouter.get("/", async (req: ProjectMemberRequest, res) => {
  const members = await prisma.projectMember.findMany({
    where: { projectId: req.projectId! },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { user: { name: "asc" } },
  });
  res.json({
    members: members.map((m) => ({
      userId: m.userId,
      role: m.role,
      user: m.user,
    })),
  });
});

membersRouter.post("/", requireProjectAdmin, async (req: ProjectMemberRequest, res) => {
  const parsed = addMemberSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { email, role } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(404).json({ error: "No user with that email. They must sign up first." });
    return;
  }
  const projectId = req.projectId!;
  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
  });
  if (existing) {
    res.status(409).json({ error: "User is already a member" });
    return;
  }
  await prisma.projectMember.create({
    data: { projectId, userId: user.id, role },
  });
  res.status(201).json({
    member: {
      userId: user.id,
      role,
      user: { id: user.id, name: user.name, email: user.email },
    },
  });
});

membersRouter.patch(
  "/:userId",
  requireProjectAdmin,
  async (req: ProjectMemberRequest, res) => {
    const parsed = patchMemberSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const projectId = req.projectId!;
    const userId = routeParam(req.params.userId);
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (userId === project?.ownerId && parsed.data.role === "MEMBER") {
      res.status(400).json({ error: "Project owner cannot be demoted to member" });
      return;
    }
    const updated = await prisma.projectMember.update({
      where: { projectId_userId: { projectId, userId } },
      data: { role: parsed.data.role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    res.json({
      member: {
        userId: updated.userId,
        role: updated.role,
        user: updated.user,
      },
    });
  }
);

membersRouter.delete(
  "/:userId",
  requireProjectAdmin,
  async (req: ProjectMemberRequest, res) => {
    const projectId = req.projectId!;
    const userId = routeParam(req.params.userId);
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (userId === project?.ownerId) {
      res.status(400).json({ error: "Cannot remove project owner" });
      return;
    }
    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId } },
    });
    res.status(204).send();
  }
);
