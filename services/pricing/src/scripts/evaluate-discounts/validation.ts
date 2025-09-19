/**
 * Validation utilities and type guards for discount evaluation system
 */

import { DiscountType, type Discount } from "@shopana/pricing-plugin-sdk";
import { plainToInstance } from "class-transformer";
import { validateSync, ValidationError } from "class-validator";
import { EvaluateDiscountsParamsDto } from "./dto.js";

/**
 * Type guard for checking discount type validity
 * @param type - Value to check
 * @returns true if type is valid DiscountType
 * @example
 * ```typescript
 * if (isValidDiscountType(discount.type)) {
 *   // TypeScript knows that discount.type is DiscountType
 * }
 * ```
 */
export const isValidDiscountType = (type: unknown): type is DiscountType =>
  type === DiscountType.PERCENTAGE || type === DiscountType.FIXED;

/**
 * Type guard for checking discount object validity
 * @param discount - Object to check
 * @returns true if discount matches Discount interface
 */
export const isValidDiscount = (discount: unknown): discount is Discount =>
  typeof discount === "object" &&
  discount !== null &&
  "code" in discount &&
  "type" in discount &&
  "value" in discount &&
  "provider" in discount;

/**
 * Creates validated class instance from plain object
 * @param cls - Class constructor for creating instance
 * @param plain - Plain object for validation
 * @returns Validated class instance
 * @throws {Error} On validation errors
 */
export function createValidated<T>(
  cls: new (...args: unknown[]) => T,
  plain: unknown,
): T {
  const instance = plainToInstance(cls, plain);
  const errors = validateSync(instance as object);

  if (errors.length > 0) {
    const messages = formatValidationErrors(errors);
    throw new Error(`Validation failed: ${messages.join("; ")}`);
  }

  return instance;
}

/**
 * Formats validation errors into human-readable format
 * @param errors - Array of validation errors
 * @param parentPath - Parent path for nested objects
 * @returns Array of formatted error messages
 */
export function formatValidationErrors(
  errors: ValidationError[],
  parentPath = "",
): string[] {
  const messages: string[] = [];

  for (const error of errors) {
    const propertyPath = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    if (error.constraints) {
      for (const constraint of Object.values(error.constraints)) {
        messages.push(`${propertyPath}: ${constraint}`);
      }
    }

    if (error.children && error.children.length > 0) {
      messages.push(...formatValidationErrors(error.children, propertyPath));
    }
  }

  return messages;
}

/**
 * Validates input parameters for discount evaluation using DTO and class-validator
 * @param params - Parameters for validation (plain object)
 * @returns Validated and typed object
 * @throws {Error} On incorrect parameters with detailed messages
 */
export const validateParams = (params: unknown): EvaluateDiscountsParamsDto => {
  return createValidated(EvaluateDiscountsParamsDto, params);
};
