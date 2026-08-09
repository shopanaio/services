import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { execa } from "execa";
import { discoverProjectUnits, findProjectUnit } from "../project-units.js";

interface PackageJson {
  scripts?: Record<string, string>;
}

async function supportsOpenApiGeneration(path: string): Promise<boolean> {
  try {
    const packageJson = JSON.parse(
      await readFile(join(path, "package.json"), "utf8"),
    ) as PackageJson;
    return typeof packageJson.scripts?.["openapi:generate"] === "string";
  } catch {
    return false;
  }
}

export async function runOpenApiGeneration(targetService?: string) {
  const available: string[] = [];
  for (const unit of discoverProjectUnits()) {
    if (await supportsOpenApiGeneration(unit.path)) available.push(unit.name);
  }

  if (targetService && !available.includes(targetService)) {
    throw new Error(
      `Unknown OpenAPI service: ${targetService}. Available: ${available.join(", ")}`,
    );
  }

  const services = targetService ? [targetService] : available;
  if (services.length === 0) {
    throw new Error("No services expose an openapi:generate script");
  }

  for (const service of services) {
    const unit = findProjectUnit(service);
    if (!unit) throw new Error(`Project unit not found: ${service}`);
    await execa("yarn", ["openapi:generate"], {
      cwd: unit.path,
      stdio: "inherit",
    });
    console.log(`✅ ${service}`);
  }
}
