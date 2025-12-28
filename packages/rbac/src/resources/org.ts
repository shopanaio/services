import { z } from "zod";

export const OrgResources = {
  "org.profile": {
    actions: ["read", "update", "delete"],
    description: "Organization profile",
  },
  "org.members": {
    actions: ["read", "invite", "update", "remove"],
    description: "Organization members",
  },
  "org.billing": {
    actions: ["read", "update"],
    description: "Billing and payments",
  },
  "org.roles": {
    actions: ["read", "create", "update", "delete"],
    description: "Role management",
  },
} as const;

const orgResourceNames = Object.keys(OrgResources) as [string, ...string[]];

export const OrgResourceSchema = z.enum(orgResourceNames);

export const OrgPermissionSchema = z
  .object({
    resource: OrgResourceSchema,
    actions: z.array(z.string()).min(1),
  })
  .refine(
    (data) => {
      const validActions = OrgResources[data.resource as keyof typeof OrgResources]?.actions;
      if (!validActions) return false;
      return data.actions.every((a) => (validActions as readonly string[]).includes(a));
    },
    { message: "Invalid action for org resource" }
  );
