import type { AppManifest } from "@shopana/app-sdk";

export function getExternallyRoutableActions(
  manifest: AppManifest,
): ReadonlySet<string> {
  const actions = new Set<string>();
  for (const action of [
    manifest.lifecycle.suspendAction,
    manifest.lifecycle.resumeAction,
    manifest.lifecycle.healthAction,
  ]) {
    if (action) {
      actions.add(action);
    }
  }
  for (const capability of manifest.capabilities) {
    for (const action of Object.values(capability.operations)) {
      actions.add(action);
    }
  }
  return actions;
}

export function assertAppOutboundContractAllowed(
  manifest: AppManifest,
  qualifiedContract: string,
  grantedScopes: readonly string[],
): void {
  const contract = qualifiedContract.trim();
  if (!contract.includes(".")) {
    throw new Error(`App contract "${contract}" must be fully qualified`);
  }

  const ownPrefix = `apps.${manifest.code}.`;
  if (contract.startsWith(ownPrefix)) {
    return;
  }

  const targetService = contract.slice(0, contract.indexOf("."));
  const declaredScopes = manifest.permissions.filter(
    (permission) =>
      permission === targetService ||
      permission.startsWith(`${targetService}.`) ||
      permission.startsWith(`${targetService}:`),
  );
  if (declaredScopes.length === 0) {
    throw new Error(
      `App "${manifest.code}" has no declared permission for service "${targetService}"`,
    );
  }
  if (!declaredScopes.some((permission) => grantedScopes.includes(permission))) {
    throw new Error(
      `App installation has no granted permission for service "${targetService}"`,
    );
  }
}

export function restrictGrantedScopes(
  manifest: AppManifest,
  grantedScopes: readonly string[],
): readonly string[] {
  const declared = new Set(manifest.permissions);
  return Object.freeze(
    [...new Set(grantedScopes)].filter((scope) => declared.has(scope)),
  );
}
