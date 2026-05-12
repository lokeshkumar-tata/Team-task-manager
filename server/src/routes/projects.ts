import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";
import {
  loadProjectMember,
  requireProjectAdmin,
  type ProjectMemberRequest,
} from "../middleware/projectMember.js";

export const projectsRouter = Router();

const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
});

projectsRouter.use(requireAuth);

projectsRouter.get("/", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    include: {
      project: {
        include: {
          _count: { select: { tasks: true } },
        },
      },
    },
    orderBy: { project: { createdAt: "desc" } },
  });
  res.json({
    projects: memberships.map((m) => ({
      id: m.project.id,
      name: m.project.name,
      description: m.project.description,
      role: m.role,
      taskCount: m.project._count.tasks,
      createdAt: m.project.createdAt,
    })),
  });
});

projectsRouter.post("/", async (req: AuthedRequest, res) => {
  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const userId = req.userId!;
  const { name, description } = parsed.data;
  const project = await prisma.project.create({
    data: {
      name,
      description,
      ownerId: userId,
      members: {
        create: { userId, role: "ADMIN" },
      },
    },
    include: {
      members: { where: { userId }, select: { role: true } },
    },
  });
  res.status(201).json({
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      role: project.members[0]?.role ?? "ADMIN",
      createdAt: project.createdAt,
    },
  });
});

projectsRouter.get(
  "/:projectId",
  loadProjectMember,
  async (req: ProjectMemberRequest, res) => {
    const project = await prisma.project.findUnique({
      where: { id: req.projectId! },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        _count: { select: { tasks: true } },
      },
    });
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.json({
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        createdAt: project.createdAt,
        owner: project.owner,
        memberCount: project.members.length,
        taskCount: project._count.tasks,
        yourRole: req.membership!.role,
        members: project.members.map((m) => ({
          userId: m.userId,
          role: m.role,
          user: m.user,
        })),
      },
    });
  }
);

projectsRouter.patch(
  "/:projectId",
  loadProjectMember,
  requireProjectAdmin,
  async (req: ProjectMemberRequest, res) => {
    const parsed = updateProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const data = parsed.data;
    const project = await prisma.project.update({
      where: { id: req.projectId! },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
      },
    });
    res.json({
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
      },
    });
  }
);

projectsRouter.delete(
  "/:projectId",
  loadProjectMember,
  requireProjectAdmin,
  async (req: ProjectMemberRequest, res) => {
    await prisma.project.delete({ where: { id: req.projectId! } });
    res.status(204).send();
  }
);
