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

export function matchesServiceLinkedOwner(
  protectedResource: ProtectedResourceRef,
  binding: { linkedOwnerType: string; linkedOwnerId: string }
): boolean {
  return (
    protectedResource.ownerType === binding.linkedOwnerType &&
    protectedResource.ownerId === binding.linkedOwnerId
  );
}
