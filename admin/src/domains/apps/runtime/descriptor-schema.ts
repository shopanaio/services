import { z } from "zod";

const navigationSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  path: z.string(),
  order: z.number().int().default(100),
});

const modalSchema = z.object({
  id: z.string().min(1),
  module: z.string().min(1),
  confirmOnDirtyClose: z.boolean().default(false),
  closeConfirmMessage: z.string().optional(),
  requiredScopes: z.array(z.string()).default([]),
});

const extensionSchema = z.object({
  id: z.string().min(1),
  point: z.string().min(1),
  module: z.string().min(1),
  priority: z.number().int().default(100),
  requiredScopes: z.array(z.string()).default([]),
  conditions: z.record(z.string(), z.unknown()).optional(),
});

export const adminAppUiDescriptorSchema = z.object({
  installationId: z.string().min(1),
  appCode: z.string().regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/),
  displayName: z.string().min(1),
  description: z.string().min(1),
  icon: z.object({
    url: z.string().min(1),
    alt: z.string().min(1),
  }),
  version: z.string().min(1),
  sdkVersionRange: z.string().min(1),
  remote: z.object({
    name: z.string().min(1),
    manifestUrl: z.string().min(1),
    contentHash: z.string().min(1),
  }),
  page: z
    .object({
      module: z.string().min(1),
      defaultPath: z.string().optional(),
    })
    .nullable()
    .optional(),
  navigation: z.array(navigationSchema).default([]),
  modals: z.array(modalSchema).default([]),
  extensions: z.array(extensionSchema).default([]),
  grantedScopes: z.array(z.string()).default([]),
});

export type AdminAppUiDescriptor = z.infer<typeof adminAppUiDescriptorSchema>;
export type AdminAppModalDescriptor = AdminAppUiDescriptor["modals"][number];
export type AdminAppExtensionDescriptor = AdminAppUiDescriptor["extensions"][number];

export function parseAdminAppUiDescriptors(input: unknown): AdminAppUiDescriptor[] {
  return z.array(adminAppUiDescriptorSchema).parse(input);
}
