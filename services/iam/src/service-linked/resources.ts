import type { ProtectedResourceRef } from "@shopana/rbac";

export const IAM_SERVICE_LINKED_RESOURCE_KIND = Object.freeze({
  application: "application",
});

export function matchesServiceLinkedOwner(
  protectedResource: ProtectedResourceRef,
  binding: { linkedOwnerType: string; linkedOwnerId: string },
): boolean {
  return (
    protectedResource.ownerType === binding.linkedOwnerType &&
    protectedResource.ownerId === binding.linkedOwnerId
  );
}
