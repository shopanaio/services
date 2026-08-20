import type { AdminAppUiDescriptor } from "../descriptor-schema";
import { getFederationRuntime } from "./runtime";

const registered = new Map<string, string>();
const verifiedManifests = new Set<string>();

function assertAllowedManifestUrl(manifestUrl: string): void {
  const url = new URL(manifestUrl, window.location.origin);
  const allowedOrigins = new Set([
    window.location.origin,
    ...String(process.env.NEXT_PUBLIC_ADMIN_APP_ASSET_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  ]);

  if (!allowedOrigins.has(url.origin)) {
    throw new Error(`Admin App asset origin "${url.origin}" is not allowed`);
  }
}

async function assertManifestIntegrity(manifestUrl: string, expectedHash: string): Promise<void> {
  if (!/^[a-f0-9]{64}$/i.test(expectedHash)) {
    return;
  }
  const cacheKey = `${manifestUrl}:${expectedHash}`;
  if (verifiedManifests.has(cacheKey)) {
    return;
  }

  const response = await fetch(manifestUrl, {
    credentials: "omit",
    cache: "force-cache",
  });
  if (!response.ok) {
    throw new Error(`Unable to verify Admin App manifest (${response.status})`);
  }
  const bytes = await response.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const actualHash = [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
  if (actualHash !== expectedHash.toLowerCase()) {
    throw new Error("Admin App manifest integrity check failed");
  }
  verifiedManifests.add(cacheKey);
}

export async function registerAdminAppRemote(descriptor: AdminAppUiDescriptor): Promise<void> {
  if (descriptor.remote.manifestUrl.startsWith("local:")) {
    return;
  }

  assertAllowedManifestUrl(descriptor.remote.manifestUrl);
  await assertManifestIntegrity(descriptor.remote.manifestUrl, descriptor.remote.contentHash);
  const current = registered.get(descriptor.remote.name);
  if (current === descriptor.remote.manifestUrl) {
    return;
  }

  const runtime = await getFederationRuntime();
  runtime.registerRemotes(
    [
      {
        name: descriptor.remote.name,
        entry: descriptor.remote.manifestUrl,
      },
    ],
    { force: Boolean(current) },
  );
  registered.set(descriptor.remote.name, descriptor.remote.manifestUrl);
}
