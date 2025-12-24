import type { GetResourcesResult } from "@shopana/shared-kernel";

/**
 * Returns the list of resources and actions exposed by the IAM service.
 * These are organization-level resources (domain = organizationId).
 */
export async function getResources(): Promise<GetResourcesResult> {
  return {
    service: "iam",
    displayName: "Organization",
    resources: [
      {
        name: "organization",
        displayName: "Organization",
        description: "Organization settings and management",
        actions: [
          { name: "read", displayName: "View", description: "View organization details" },
          { name: "update", displayName: "Edit", description: "Edit organization settings" },
          { name: "delete", displayName: "Delete", description: "Delete organization" },
        ],
      },
      {
        name: "organization/billing",
        displayName: "Billing",
        description: "Billing and subscription management",
        actions: [
          { name: "read", displayName: "View", description: "View billing information" },
          { name: "update", displayName: "Manage", description: "Manage billing settings" },
        ],
      },
      {
        name: "member",
        displayName: "Members",
        description: "Organization member management",
        actions: [
          { name: "read", displayName: "View", description: "View members list" },
          { name: "invite", displayName: "Invite", description: "Invite new members" },
          { name: "remove", displayName: "Remove", description: "Remove members" },
          { name: "update", displayName: "Change Role", description: "Change member roles" },
        ],
      },
      {
        name: "role",
        displayName: "Roles",
        description: "Role and permission management",
        actions: [
          { name: "read", displayName: "View", description: "View roles" },
          { name: "create", displayName: "Create", description: "Create custom roles" },
          { name: "update", displayName: "Edit", description: "Edit role permissions" },
          { name: "delete", displayName: "Delete", description: "Delete custom roles" },
        ],
      },
    ],
  };
}
