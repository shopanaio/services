import type { Delivery } from "@shopana/broker-types";
import { z } from "zod";

const identifierSchema = z.string().trim().min(1).max(512);

export const DeliveryCustomizationOperationSchema = z.discriminatedUnion(
  "type",
  [
    z
      .object({
        type: z.literal("HIDE"),
        groupId: identifierSchema,
        optionHandle: identifierSchema,
        reasonCode: identifierSchema,
      })
      .strict(),
    z
      .object({
        type: z.literal("MOVE"),
        groupId: identifierSchema,
        optionHandle: identifierSchema,
        index: z.number().int().nonnegative().max(10_000),
      })
      .strict(),
    z
      .object({
        type: z.literal("RENAME"),
        groupId: identifierSchema,
        optionHandle: identifierSchema,
        title: z.string().trim().min(1).max(255),
      })
      .strict(),
  ],
);

export const DeliveryCustomizationFunctionResultSchema = z
  .object({
    operations: z.array(DeliveryCustomizationOperationSchema).max(10_000),
  })
  .strict()
  .superRefine((value, context) => {
    const targets = value.operations.map(
      (operation) =>
        `${operation.type}:${operation.groupId}:${operation.optionHandle}`,
    );
    if (new Set(targets).size !== targets.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["operations"],
        message: "A function cannot repeat the same operation for one option",
      });
    }
  });

export function parseDeliveryCustomizationFunctionResult(
  value: unknown,
): Delivery.DeliveryCustomizationFunctionResult {
  return DeliveryCustomizationFunctionResultSchema.parse(
    value,
  ) as Delivery.DeliveryCustomizationFunctionResult;
}
