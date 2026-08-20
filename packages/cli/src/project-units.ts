import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { findRootDir } from "./utils.js";

export type ProjectUnitKind = "service" | "app";

export interface ProjectUnit {
  readonly kind: ProjectUnitKind;
  readonly name: string;
  readonly path: string;
  readonly hostService?: string;
}

function discoverIn(root: string, kind: ProjectUnitKind): ProjectUnit[] {
  if (!existsSync(root)) {
    return [];
  }

  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => existsSync(join(root, entry.name, "package.json")))
    .map((entry) => ({
      kind,
      name: entry.name,
      path: join(root, entry.name),
      ...(kind === "app" ? { hostService: "apps" } : {}),
    }));
}

export function discoverProjectUnits(): ProjectUnit[] {
  const root = findRootDir();
  return [
    ...discoverIn(join(root, "apps"), "app"),
    ...discoverIn(join(root, "services"), "service"),
  ].sort((left, right) => {
    if (left.kind !== right.kind) {
      return left.kind === "app" ? -1 : 1;
    }
    return left.name.localeCompare(right.name);
  });
}

export function findProjectUnit(name: string, kind?: ProjectUnitKind): ProjectUnit | undefined {
  return discoverProjectUnits().find((unit) => unit.name === name && (!kind || unit.kind === kind));
}

export function readProjectUnitPackage(unit: ProjectUnit): {
  readonly name?: string;
  readonly description?: string;
  readonly scripts?: Record<string, string>;
} {
  return JSON.parse(readFileSync(join(unit.path, "package.json"), "utf8"));
}
