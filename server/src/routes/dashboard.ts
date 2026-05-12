import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get("/summary", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    select: { projectId: true },
  });
  const projectIds = memberships.map((m) => m.projectId);

  if (projectIds.length === 0) {
    res.json({
      totals: { todo: 0, inProgress: 0, done: 0, overdue: 0 },
      overdueTasks: [],
      projects: [],
    });
    return;
  }

  const now = new Date();

  const [statusCounts, overdueTasks, projectSummaries] = await Promise.all([
    prisma.task.groupBy({
      by: ["status"],
      where: { projectId: { in: projectIds } },
      _count: { _all: true },
    }),
    prisma.task.findMany({
      where: {
        projectId: { in: projectIds },
        dueDate: { lt: now },
        status: { not: "DONE" },
      },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 25,
    }),
    prisma.project.findMany({
      where: { id: { in: projectIds } },
      include: {
        tasks: { select: { status: true, dueDate: true } },
      },
    }),
  ]);

  const totals = {
    todo: 0,
    inProgress: 0,
    done: 0,
    overdue: 0,
  };

  for (const row of statusCounts) {
    if (row.status === "TODO") totals.todo = row._count._all;
    if (row.status === "IN_PROGRESS") totals.inProgress = row._count._all;
    if (row.status === "DONE") totals.done = row._count._all;
  }

  for (const p of projectSummaries) {
    for (const t of p.tasks) {
      if (t.dueDate && t.dueDate < now && t.status !== "DONE") {
        totals.overdue += 1;
      }
    }
  }

  res.json({
    totals,
    overdueTasks: overdueTasks.map((t) => ({
      id: t.id,
      title: t.title,
      dueDate: t.dueDate,
      status: t.status,
      project: t.project,
      assignee: t.assignee,
    })),
    projects: projectSummaries.map((p) => {
      const counts = { todo: 0, inProgress: 0, done: 0 };
      let overdue = 0;
      for (const t of p.tasks) {
        if (t.status === "TODO") counts.todo++;
        else if (t.status === "IN_PROGRESS") counts.inProgress++;
        else counts.done++;
        if (t.dueDate && t.dueDate < now && t.status !== "DONE") overdue++;
      }
      return {
        id: p.id,
        name: p.name,
        taskCounts: counts,
        overdueCount: overdue,
      };
    }),
  });
});
