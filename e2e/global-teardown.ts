import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export default async function globalTeardown() {
  if (process.env.E2E_START_SERVERS === "false") {
    return;
  }

  if (process.env.E2E_START_DOCKER === "false") {
    return;
  }

  const teardownDir = dirname(fileURLToPath(import.meta.url));
  const composeFile = resolve(teardownDir, "docker-compose.infra.yml");

  execFileSync(
    "docker",
    ["compose", "-p", "shopana-e2e", "-f", composeFile, "down", "--remove-orphans"],
    {
      stdio: "inherit",
    },
  );
}
