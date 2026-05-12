import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "fs";
import { spawn, spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const binDir = path.dirname(process.execPath);
const npx = path.join(binDir, "npx");

const PG_PORT = Number(process.env.LOCAL_PG_PORT || 55432);

const databaseDir = path.join(root, ".data/pg");

const pg = new EmbeddedPostgres({
  databaseDir,
  user: "postgres",
  password: "postgres",
  port: PG_PORT,
  persistent: true,
});

const clusterReady = existsSync(path.join(databaseDir, "PG_VERSION"));
if (!clusterReady) {
  await pg.initialise();
}
await pg.start();

const baseEnv = {
  ...process.env,
  DATABASE_URL: `postgresql://postgres:postgres@127.0.0.1:${PG_PORT}/postgres`,
  JWT_SECRET: process.env.JWT_SECRET || "local-dev-jwt-secret-change-me",
  PATH: `${binDir}${path.delimiter}${process.env.PATH || ""}`,
};

const serverDir = path.join(root, "server");
const clientDir = path.join(root, "client");

const gen = spawnSync(npx, ["prisma", "generate"], { cwd: serverDir, env: baseEnv, stdio: "inherit" });
if (gen.status !== 0) {
  await pg.stop();
  process.exit(gen.status ?? 1);
}

const mig = spawnSync(npx, ["prisma", "migrate", "deploy"], {
  cwd: serverDir,
  env: baseEnv,
  stdio: "inherit",
});
if (mig.status !== 0) {
  await pg.stop();
  process.exit(mig.status ?? 1);
}

const srv = spawn(npx, ["tsx", "watch", "src/index.ts"], {
  cwd: serverDir,
  env: baseEnv,
  stdio: "inherit",
});

const cli = spawn(npx, ["vite"], {
  cwd: clientDir,
  env: {
    ...process.env,
    PATH: `${binDir}${path.delimiter}${process.env.PATH || ""}`,
  },
  stdio: "inherit",
});

function shutdown() {
  srv.kill("SIGINT");
  cli.kill("SIGINT");
  pg.stop()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

srv.on("exit", (code) => {
  if (code && code !== 0) shutdown();
});
cli.on("exit", (code) => {
  if (code && code !== 0) shutdown();
});
