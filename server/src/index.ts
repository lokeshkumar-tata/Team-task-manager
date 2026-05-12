import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { authRouter } from "./routes/auth.js";
import { projectsRouter } from "./routes/projects.js";
import { membersRouter } from "./routes/members.js";
import { tasksRouter } from "./routes/tasks.js";
import { dashboardRouter } from "./routes/dashboard.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ?? true,
    credentials: true,
  })
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/projects/:projectId/members", membersRouter);
app.use("/api/projects/:projectId/tasks", tasksRouter);

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

const clientDist = path.resolve(__dirname, "../../client/dist");
app.use(express.static(clientDist));

// Express 5 / path-to-regexp v8+: avoid legacy `*` patterns; serve SPA after static misses.
app.use((req, res, next) => {
  if (req.method !== "GET") {
    next();
    return;
  }
  if (req.path.startsWith("/api")) {
    next();
    return;
  }
  res.sendFile(path.join(clientDist, "index.html"), (err) => {
    if (err) next(err);
  });
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
