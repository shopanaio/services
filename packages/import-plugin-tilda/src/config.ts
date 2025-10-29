import { z } from "zod";

const baseSourceConfig = z.object({
  delimiter: z
    .string()
    .min(1, "Delimiter must contain at least one character")
    .optional(),
});

export const tildaFeedSourceSchema = z.discriminatedUnion("source", [
  baseSourceConfig.extend({
    source: z.literal("url"),
    url: z.string().url("Feed URL must be a valid URL"),
  }),
  baseSourceConfig.extend({
    source: z.literal("file"),
    path: z.string().min(1, "File path must be provided"),
  }),
]);

export const storageConfigSchema = z.object({
  endpoint: z
    .string()
    .url("Storage endpoint must be a valid URL"),
  accessKey: z.string().min(1, "Storage access key must be provided"),
  secretKey: z.string().min(1, "Storage secret key must be provided"),
  bucket: z.string().min(1, "Bucket name must be provided"),
  region: z.string().min(1).optional(),
  prefix: z.string().min(1).optional(),
  pathStyle: z.boolean().optional(),
  sessionToken: z.string().min(1).optional(),
});

export const configSchema = z.object({
  feed: tildaFeedSourceSchema,
  storage: storageConfigSchema,
});

export type TildaFeedConfig = z.infer<typeof tildaFeedSourceSchema>;
export type TildaStorageConfig = z.infer<typeof storageConfigSchema>;
export type TildaImportConfig = z.infer<typeof configSchema>;
