import { Transform } from "class-transformer";
import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  isUUID,
} from "class-validator";
import { GlobalIdEntity } from "./index.js";
import { decodeGlobalIdByType } from "./idCodec.js";

/**
 * Validates and transforms a Global ID to UUID7
 *
 * @param entityType - Optional entity type to validate. If not provided, any valid Global ID type is accepted.
 * @param validationOptions - Class-validator options
 *
 * @example
 * ```typescript
 * class MyDto {
 *   @IsGlobalId({
 *      entityType: 'Checkout',
 *      message: "Invalid checkout ID format",
 *   })
 *   checkoutId!: string; // Will be transformed from base64 Global ID to UUID7
 *
 *   @IsGlobalId() // Any valid Global ID type
 *   someId!: string;
 * }
 * ```
 */
export function IsGlobalId({
  entityType,
  ...validationOptions
}: ValidationOptions & { entityType?: GlobalIdEntity } = {}) {
  return function (object: any, propertyName: string) {
    // Apply transformer
    Transform(({ value }) => {
      if (typeof value !== "string" || !value) {
        return value; // Let validator handle invalid types
      }

      try {
        return decodeGlobalIdByType(value, entityType);
      } catch {
        return value; // Keep original value, validator will catch the decode error
      }
    })(object, propertyName);

    // Apply validator
    registerDecorator({
      name: "isGlobalId",
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: entityType
          ? `Invalid ${entityType} Global ID format or UUID`
          : "Invalid Global ID format or UUID",
        ...validationOptions,
      },
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          if (typeof value !== "string" || !value) {
            return false;
          }

          try {
            const { [args.property]: value } = args.object as Record<
              string,
              unknown
            >;

            return isUUID(value, 7);
          } catch {
            // If decode fails, validation fails immediately
            return false;
          }
        },
      },
    });
  };
}

/**
 * Validates and transforms an array of Global IDs to UUID7s
 *
 * @param entityType - Optional entity type to validate. If not provided, any valid Global ID type is accepted.
 * @param validationOptions - Class-validator options
 *
 * @example
 * ```typescript
 * class MyDto {
 *   @IsGlobalIdArray(GlobalIdEntity.CheckoutLine)
 *   lineIds!: string[]; // Will be transformed from base64 Global IDs to UUID7s
 *
 *   @IsGlobalIdArray(GlobalIdEntity.CheckoutDeliveryAddress, { message: "Invalid address IDs" })
 *   addressIds!: string[];
 *
 *   @IsGlobalIdArray() // Any valid Global ID types (mixed array)
 *   mixedIds!: string[];
 * }
 * ```
 */
export function IsGlobalIdArray({
  entityType,
  ...validationOptions
}: ValidationOptions & { entityType?: GlobalIdEntity } = {}) {
  return function (object: any, propertyName: string) {
    // Apply transformer
    Transform(({ value }) => {
      if (!Array.isArray(value)) {
        return value; // Let validator handle invalid types
      }

      try {
        return value.map((item) => {
          if (typeof item !== "string" || !item) {
            return item; // Let validator handle invalid items
          }

          try {
            return decodeGlobalIdByType(item, entityType);
          } catch {
            return item; // Keep original value, validator will catch the decode error
          }
        });
      } catch {
        return value; // Keep original array, validator will catch decode errors
      }
    })(object, propertyName);

    // Apply validator
    registerDecorator({
      name: "isGlobalIdArray",
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: entityType
          ? `All items must be valid ${entityType} Global IDs`
          : "All items must be valid Global IDs",
        ...validationOptions,
      },
      validator: {
        validate(_: unknown, args: ValidationArguments) {
          const { [args.property]: originalArray } = args.object as Record<
            string,
            unknown[]
          >;

          if (!Array.isArray(originalArray)) {
            return false;
          }

          return originalArray.every((it) => {
            if (typeof it !== "string" || !it) {
              return false;
            }

            try {
              return isUUID(it, 7);
            } catch {
              return false;
            }
          });
        },
      },
    });
  };
}
