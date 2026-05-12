import { Router } from "express";
import { z } from "zod";
import type { TaskStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { routeParam } from "../lib/routeParams.js";
import { canDeleteTask, canEditTask } from "../lib/rbac.js";
import { loadProjectMember, type ProjectMemberRequest } from "../middleware/projectMember.js";

export const tasksRouter = Router({ mergeParams: true });

const createTaskSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(5000).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  assigneeId: z.string().cuid().nullable().optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(5000).nullable().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  assigneeId: z.string().cuid().nullable().optional(),
});

tasksRouter.use(loadProjectMember);

tasksRouter.get("/", async (req: ProjectMemberRequest, res) => {
  const projectId = req.projectId!;
  const tasks = await prisma.task.findMany({
    where: { projectId },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      creator: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });
  res.json({
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      dueDate: t.dueDate,
      assignee: t.assignee,
      creator: t.creator,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })),
  });
});

tasksRouter.post("/", async (req: ProjectMemberRequest, res) => {
  const parsed = createTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const userId = req.userId!;
  const projectId = req.projectId!;
  const role = req.membership!.role;
  const body = parsed.data;

  let assigneeId: string | null = body.assigneeId ?? null;
  if (assigneeId && role !== "ADMIN") {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: assigneeId } },
    });
    if (!member) {
      res.status(400).json({ error: "Assignee must be a project member" });
      return;
    }
  }
  if (assigneeId && role === "ADMIN") {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: assigneeId } },
    });
    if (!member) {
      res.status(400).json({ error: "Assignee must be a project member" });
      return;
    }
  }

  if (role !== "ADMIN" && assigneeId && assigneeId !== userId) {
    res.status(403).json({ error: "Only admins can assign tasks to other members" });
    return;
  }

  const dueDate =
    body.dueDate === undefined
      ? undefined
      : body.dueDate === null
        ? null
        : new Date(body.dueDate);

  const task = await prisma.task.create({
    data: {
      projectId,
      title: body.title,
      description: body.description,
      status: (body.status ?? "TODO") as TaskStatus,
      dueDate,
      assigneeId,
      createdById: userId,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      creator: { select: { id: true, name: true, email: true } },
    },
  });

  res.status(201).json({
    task: {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      dueDate: task.dueDate,
      assignee: task.assignee,
      creator: task.creator,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    },
  });
});

tasksRouter.patch("/:taskId", async (req: ProjectMemberRequest, res) => {
  const parsed = updateTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const userId = req.userId!;
  const role = req.membership!.role;
  const projectId = req.projectId!;
  const taskId = routeParam(req.params.taskId);

  const existing = await prisma.task.findFirst({
    where: { id: taskId, projectId },
  });
  if (!existing) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  if (
    parsed.data.assigneeId !== undefined &&
    parsed.data.assigneeId !== null &&
    role !== "ADMIN"
  ) {
    res.status(403).json({ error: "Only admins can change assignee" });
    return;
  }

  if (parsed.data.assigneeId) {
    const m = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId: parsed.data.assigneeId },
      },
    });
    if (!m) {
      res.status(400).json({ error: "Assignee must be a project member" });
      return;
    }
  }

  if (
    !canEditTask(role, {
      userId,
      createdById: existing.createdById,
      assigneeId: existing.assigneeId,
    })
  ) {
    res.status(403).json({ error: "You cannot edit this task" });
    return;
  }

  const data = parsed.data;
  const dueDate =
    data.dueDate === undefined
      ? undefined
      : data.dueDate === null
        ? null
        : new Date(data.dueDate);

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.status !== undefined && { status: data.status as TaskStatus }),
      ...(dueDate !== undefined && { dueDate }),
      ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId }),
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      creator: { select: { id: true, name: true, email: true } },
    },
  });

  res.json({
    task: {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      dueDate: task.dueDate,
      assignee: task.assignee,
      creator: task.creator,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    },
  });
});

tasksRouter.delete("/:taskId", async (req: ProjectMemberRequest, res) => {
  const userId = req.userId!;
  const role = req.membership!.role;
  const projectId = req.projectId!;
  const taskId = routeParam(req.params.taskId);

  const existing = await prisma.task.findFirst({
    where: { id: taskId, projectId },
  });
  if (!existing) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const allowDelete =
    role === "ADMIN" ||
    canDeleteTask(role, { createdById: existing.createdById, userId });

  if (!allowDelete) {
    res.status(403).json({ error: "Only the task creator or an admin can delete this task" });
    return;
  }

  await prisma.task.delete({ where: { id: taskId } });
  res.status(204).send();
});
