import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  Validate,
} from "class-validator";
import { version as uuidVersion, validate as uuidValidate } from "uuid";

/**
 * Checks that a value is a valid ISO-4217 currency code (3 uppercase letters).
 */
export function IsISO4217(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "IsISO4217",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (value == null) return false;
          if (typeof value !== "string") return false;
          return /^[A-Z]{3}$/.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid ISO-4217 currency code (3 uppercase letters)`;
        },
      },
    });
  };
}

/**
 * Checks that a value is a valid UUID v7.
 */
export function IsUUIDv7(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "IsUUIDv7",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== "string") return false;
          if (!uuidValidate(value)) return false;
          return uuidVersion(value) === 7;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid UUIDv7`;
        },
      },
    });
  };
}

/**
 * Class-level validator ensuring displayCurrencyCode and displayExchangeRate
 * are provided together or both null. Also ensures exchange rate is > 0 when provided.
 */
@ValidatorConstraint({ name: "DisplayCurrencyPair", async: false })
export class DisplayCurrencyPairConstraint
  implements ValidatorConstraintInterface
{
  validate(_value: any, args: ValidationArguments) {
    const obj = args.object as Record<string, unknown>;
    const code = obj["displayCurrencyCode"];
    const rate = obj["displayExchangeRate"];
    const hasCode = code != null;
    const hasRate = rate != null;
    if (hasCode !== hasRate) return false;
    if (hasRate && typeof rate === "number" && !(rate > 0)) return false;
    return true;
  }
  defaultMessage(): string {
    return "displayCurrencyCode and displayExchangeRate must be provided together (and exchange rate must be > 0 when provided)";
  }
}

export function ValidateDisplayCurrencyPair(
  validationOptions?: ValidationOptions
) {
  return Validate(DisplayCurrencyPairConstraint, [], validationOptions);
}
