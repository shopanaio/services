import { z } from "zod";
import { INVENTORY_UPDATE_EVENT } from "./constants.js";

const isoDateStringSchema = z
  .string()
  .datetime({ offset: true })
  .describe("ISO-8601 string with timezone offset");

export const moneyValueSchema = z.object({
  amount: z
    .number()
    .int("Money amount must be provided in minor units")
    .describe("Value in minor units, e.g. cents"),
  currency: z
    .string()
    .min(1, "Currency code is required")
    .describe("ISO-4217 currency code"),
});

export const inventoryAvailabilitySchema = z.enum([
  "in_stock",
  "out_of_stock",
  "preorder",
  "backorder",
  "discontinued",
  "unknown",
]);

const quantitySchema = z
  .object({
    available: z
      .number()
      .int("Available quantity must be an integer")
      .min(0, "Available quantity cannot be negative")
      .optional(),
    reserved: z
      .number()
      .int("Reserved quantity must be an integer")
      .min(0, "Reserved quantity cannot be negative")
      .optional(),
    incoming: z
      .number()
      .int("Incoming quantity must be an integer")
      .min(0, "Incoming quantity cannot be negative")
      .optional(),
  })
  .refine(
    (value) =>
      value.available !== undefined ||
      value.reserved !== undefined ||
      value.incoming !== undefined,
    "Quantity update must provide at least one metric"
  );

export const inventoryItemSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  hash: z.string().min(1, "Item hash is required"),
  sourceId: z.string().min(1).optional(),
  barcode: z.array(z.string().min(1)).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  brand: z.string().optional(),
  categoryPath: z.array(z.string().min(1)).optional(),
  productUrl: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
  tags: z.array(z.string().min(1)).optional(),
  availability: inventoryAvailabilitySchema.optional(),
  quantity: quantitySchema.optional(),
  price: moneyValueSchema.optional(),
  salePrice: moneyValueSchema.optional(),
  compareAtPrice: moneyValueSchema.optional(),
  attributes: z
    .record(
      z.string(),
      z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.array(z.string()),
        z.null(),
      ])
    )
    .optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const inventoryUpdateOperationSchema = z.enum(["UPSERT"]);

export const inventoryUpdateEntrySchema = z.object({
  operation: inventoryUpdateOperationSchema.default("UPSERT"),
  item: inventoryItemSchema,
});

export const inventoryUpdateChecksumSchema = z.object({
  algorithm: z.enum(["md5", "sha256"]),
  value: z.string().min(1, "Checksum value is required"),
});

export const inventoryUpdateStorageSchema = z.object({
  provider: z.literal("s3"),
  bucket: z.string().min(1, "Bucket name is required"),
  objectKey: z.string().min(1, "Object key is required"),
  region: z.string().min(1).optional(),
  endpoint: z.string().url().optional(),
  versionId: z.string().min(1).optional(),
  contentType: z.string().min(1).optional(),
  contentLength: z.number().int().min(0).optional(),
  checksum: inventoryUpdateChecksumSchema.optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

export const inventoryUpdateSourceSchema = z.object({
  pluginCode: z.string().min(1, "Plugin code is required"),
  integrationId: z.string().min(1).optional(),
  feedId: z.string().min(1).optional(),
  locationId: z.string().min(1).optional(),
  feedType: z.string().min(1, "Feed type is required"),
});

export const inventoryUpdateMetaSchema = z.object({
  taskId: z.string().min(1).optional(),
  correlationId: z.string().min(1).optional(),
  requestedBy: z.string().min(1).optional(),
  chunkIndex: z.number().int().min(0).optional(),
  chunkCount: z.number().int().positive().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  payloadFormat: z.string().min(1).optional(),
  compression: z.enum(["none", "gzip"]).optional(),
  itemCount: z.number().int().min(0).optional(),
});

export const inventoryUpdateTaskSchema = z.object({
  source: inventoryUpdateSourceSchema,
  storage: inventoryUpdateStorageSchema,
  issuedAt: isoDateStringSchema.optional(),
  meta: inventoryUpdateMetaSchema.optional(),
});

export type InventoryAvailability = z.infer<typeof inventoryAvailabilitySchema>;
export type MoneyValue = z.infer<typeof moneyValueSchema>;
export type InventoryQuantity = z.infer<typeof quantitySchema>;
export type InventoryItem = z.infer<typeof inventoryItemSchema>;
export type InventoryUpdateOperation = z.infer<
  typeof inventoryUpdateOperationSchema
>;
export type InventoryUpdateEntry = z.infer<typeof inventoryUpdateEntrySchema>;
export type InventoryUpdateSource = z.infer<typeof inventoryUpdateSourceSchema>;
export type InventoryUpdateMeta = z.infer<typeof inventoryUpdateMetaSchema>;
export type InventoryUpdateStorage = z.infer<
  typeof inventoryUpdateStorageSchema
>;
export type InventoryUpdateTask = z.infer<typeof inventoryUpdateTaskSchema>;

/**
 * Ensures that the provided payload matches the inventory update task contract.
 * Returns the validated payload and throws when validation fails.
 */
export function validateInventoryUpdateTask(
  task: InventoryUpdateTask
): InventoryUpdateTask {
  return inventoryUpdateTaskSchema.parse(task);
}

/**
 * Type guard that raises an exception when payload does not match the contract.
 */
export function assertInventoryUpdateTask(
  payload: unknown
): asserts payload is InventoryUpdateTask {
  inventoryUpdateTaskSchema.parse(payload);
}

/**
 * Helper that returns the Moleculer event name for inventory updates.
 * Exported to keep the canonical value co-located with the schema.
 */
export function getInventoryUpdateEvent(): typeof INVENTORY_UPDATE_EVENT {
  return INVENTORY_UPDATE_EVENT;
}
