import type { ProtectedResourceRef } from "@shopana/rbac";

export const IAM_SERVICE_LINKED_RESOURCE_KIND = Object.freeze({
  application: "application",
});

export const IAM_LINKED_SERVICE = Object.freeze({
  project: "project",
});

export const IAM_LINKED_OWNER_TYPE = Object.freeze({
  store: "store",
});

const APPLICATION_LINKED_SERVICE_RESOURCES = new Set([
  "org.applications",
  "org.application-auth",
  "org.application-auth-providers",
  "org.application-oauth-clients",
  "org.application-users",
]);

const SERVICE_LINKED_WRITE_ACTIONS = new Set(["write", "admin"]);

export function isServiceLinkedWriteAction(action: string): boolean {
  return SERVICE_LINKED_WRITE_ACTIONS.has(action);
}

export function isIamServiceLinkedPermission(
  resourceKind: string,
  resource: string,
  action: string
): boolean {
  if (!isServiceLinkedWriteAction(action)) return false;
  return (
    resourceKind === IAM_SERVICE_LINKED_RESOURCE_KIND.application &&
    APPLICATION_LINKED_SERVICE_RESOURCES.has(resource)
  );
}

export function matchesServiceLinkedOwner(
  protectedResource: ProtectedResourceRef,
  binding: { linkedOwnerType: string; linkedOwnerId: string }
): boolean {
  return (
    protectedResource.ownerType === binding.linkedOwnerType &&
    protectedResource.ownerId === binding.linkedOwnerId
  );
}
