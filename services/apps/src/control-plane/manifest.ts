import { createHash } from "node:crypto";
import type { AppManifest } from "@shopana/app-sdk";
import type { AppManifestSnapshot } from "./types.js";

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}

export function snapshotManifest(
  manifest: AppManifest,
): AppManifestSnapshot {
  const canonical = JSON.stringify(canonicalize(manifest));
  return {
    manifest,
    hash: createHash("sha256").update(canonical).digest("hex"),
  };
}
