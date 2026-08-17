import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { CustomerAddressPatch } from "../../repositories/address/CustomerAddressRepository.js";
import type { CustomerAddressesUpdateOperation } from "../../workflows/dto/index.js";
import {
  internalSectionError,
  sectionErrors,
  sectionSuccess,
  type CustomerSectionResult,
} from "./types.js";

export interface CustomerAddressesUpdateParams {
  customerId: string;
  operations: CustomerAddressesUpdateOperation["params"];
}

export class CustomerAddressesUpdateScript extends BaseScript<
  CustomerAddressesUpdateParams,
  CustomerSectionResult
> {
  @Transactional()
  protected async execute(
    params: CustomerAddressesUpdateParams
  ): Promise<CustomerSectionResult> {
    const { customerId, operations } = params;
    const errors = await this.validate(customerId, operations);
    if (errors.length > 0) return sectionErrors(errors);

    for (const input of operations.create) {
      await this.repository.address.create({
        ...input,
        customerId,
        isDefaultShipping: input.isDefaultShipping ?? false,
        isDefaultBilling: input.isDefaultBilling ?? false,
      });
    }
    for (const input of operations.update) {
      await this.repository.address.update(
        input.addressId,
        input.operations as unknown as CustomerAddressPatch
      );
    }
    for (const addressId of operations.deleteIds) {
      await this.repository.address.softDelete(addressId);
    }

    const hasShippingDefault = Object.prototype.hasOwnProperty.call(
      operations,
      "defaultShippingAddressId"
    );
    const hasBillingDefault = Object.prototype.hasOwnProperty.call(
      operations,
      "defaultBillingAddressId"
    );
    if (hasShippingDefault || hasBillingDefault) {
      const [currentShipping, currentBilling] = await Promise.all([
        this.repository.address.findDefaultShipping(customerId),
        this.repository.address.findDefaultBilling(customerId),
      ]);
      const updated = await this.repository.address.setDefaults(customerId, {
        shippingAddressId: hasShippingDefault
          ? operations.defaultShippingAddressId ?? null
          : currentShipping?.id ?? null,
        billingAddressId: hasBillingDefault
          ? operations.defaultBillingAddressId ?? null
          : currentBilling?.id ?? null,
      });
      if (!updated) {
        throw new Error("Validated customer address defaults could not be persisted");
      }
    }

    const changed = hasAddressChanges(operations);
    if (changed) {
      await this.invalidateDynamicSegments(customerId, ["address"], "address");
    }
    return sectionSuccess(changed);
  }

  protected handleError(_error: unknown): CustomerSectionResult {
    return internalSectionError();
  }

  private async validate(
    customerId: string,
    operations: CustomerAddressesUpdateOperation["params"]
  ) {
    const errors: Array<{ message: string; code: string; field?: string[] }> = [];
    const updateIds = operations.update.map((item) => item.addressId);
    const referencedIds = [
      ...updateIds,
      ...operations.deleteIds,
      ...(operations.defaultShippingAddressId
        ? [operations.defaultShippingAddressId]
        : []),
      ...(operations.defaultBillingAddressId
        ? [operations.defaultBillingAddressId]
        : []),
    ];
    const rows = await this.repository.address.getByIds(referencedIds);
    const byId = new Map(rows.map((row) => [row.id, row]));

    for (const [index, input] of operations.create.entries()) {
      validateRequiredString(input.address1, ["create", String(index), "address1"], errors);
      validateRequiredString(input.city, ["create", String(index), "city"], errors);
      validateRequiredString(
        input.countryCode,
        ["create", String(index), "countryCode"],
        errors
      );
      validatePhone(input.phoneE164, ["create", String(index), "phoneE164"], errors);
      validateCountryCode(input.countryCode, ["create", String(index), "countryCode"], errors);
      validateCoordinate(input.latitude, -90, 90, ["create", String(index), "latitude"], errors);
      validateCoordinate(input.longitude, -180, 180, ["create", String(index), "longitude"], errors);
    }

    for (const [index, input] of operations.update.entries()) {
      validateOwnedAddress(
        byId,
        input.addressId,
        customerId,
        ["update", String(index), "addressId"],
        errors
      );
      validateOptionalRequiredString(
        input.operations.address1,
        ["update", String(index), "operations", "address1"],
        errors
      );
      validateOptionalRequiredString(
        input.operations.city,
        ["update", String(index), "operations", "city"],
        errors
      );
      validateOptionalRequiredString(
        input.operations.countryCode,
        ["update", String(index), "operations", "countryCode"],
        errors
      );
      validatePhone(
        input.operations.phoneE164,
        ["update", String(index), "operations", "phoneE164"],
        errors
      );
      validateCountryCode(
        input.operations.countryCode,
        ["update", String(index), "operations", "countryCode"],
        errors,
      );
      validateCoordinate(input.operations.latitude, -90, 90, ["update", String(index), "operations", "latitude"], errors);
      validateCoordinate(input.operations.longitude, -180, 180, ["update", String(index), "operations", "longitude"], errors);
    }

    for (const [index, addressId] of operations.deleteIds.entries()) {
      validateOwnedAddress(
        byId,
        addressId,
        customerId,
        ["deleteIds", String(index)],
        errors
      );
      if (updateIds.includes(addressId)) {
        errors.push({
          message: "Address cannot be updated and deleted in the same command",
          code: "CONFLICTING_OPERATION",
          field: ["deleteIds", String(index)],
        });
      }
    }

    for (const [field, addressId] of [
      ["defaultShippingAddressId", operations.defaultShippingAddressId],
      ["defaultBillingAddressId", operations.defaultBillingAddressId],
    ] as const) {
      if (!addressId) continue;
      validateOwnedAddress(byId, addressId, customerId, [field], errors);
      if (operations.deleteIds.includes(addressId)) {
        errors.push({
          message: "A deleted address cannot be selected as a default",
          code: "CONFLICTING_OPERATION",
          field: [field],
        });
      }
    }

    addDuplicateErrors(updateIds, ["update"], "addressId", errors);
    addDuplicateErrors(operations.deleteIds, ["deleteIds"], undefined, errors);
    return errors;
  }
}

function hasAddressChanges(
  operations: CustomerAddressesUpdateOperation["params"]
) {
  return (
    operations.create.length > 0 ||
    operations.update.length > 0 ||
    operations.deleteIds.length > 0 ||
    Object.prototype.hasOwnProperty.call(operations, "defaultShippingAddressId") ||
    Object.prototype.hasOwnProperty.call(operations, "defaultBillingAddressId")
  );
}

function validateOwnedAddress(
  byId: Map<string, { customerId: string }>,
  addressId: string,
  customerId: string,
  field: string[],
  errors: Array<{ message: string; code: string; field?: string[] }>
) {
  const address = byId.get(addressId);
  if (!address || address.customerId !== customerId) {
    errors.push({
      message: "Address not found for this customer",
      code: "NOT_FOUND",
      field,
    });
  }
}

function validateRequiredString(
  value: string,
  field: string[],
  errors: Array<{ message: string; code: string; field?: string[] }>
) {
  if (value.trim().length === 0) {
    errors.push({ message: "Value cannot be empty", code: "INVALID_VALUE", field });
  }
}

function validateOptionalRequiredString(
  value: string | null | undefined,
  field: string[],
  errors: Array<{ message: string; code: string; field?: string[] }>
) {
  if (value !== undefined && (value === null || value.trim().length === 0)) {
    errors.push({ message: "Value cannot be empty", code: "INVALID_VALUE", field });
  }
}

function validatePhone(
  value: string | null | undefined,
  field: string[],
  errors: Array<{ message: string; code: string; field?: string[] }>
) {
  if (value && !/^\+[1-9][0-9]{6,14}$/.test(value)) {
    errors.push({
      message: "Phone number must use E.164 format",
      code: "INVALID_PHONE",
      field,
    });
  }
}

function validateCountryCode(
  value: string | null | undefined,
  field: string[],
  errors: Array<{ message: string; code: string; field?: string[] }>,
) {
  if (value !== undefined && (value === null || !/^[A-Za-z]{2}$/u.test(value.trim()))) {
    errors.push({ message: "Country code must use ISO alpha-2 format", code: "INVALID_COUNTRY_CODE", field });
  }
}

function validateCoordinate(
  value: number | string | null | undefined,
  minimum: number,
  maximum: number,
  field: string[],
  errors: Array<{ message: string; code: string; field?: string[] }>,
) {
  if (value == null) return;
  const coordinate = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(coordinate) || coordinate < minimum || coordinate > maximum) {
    errors.push({ message: "Coordinate is outside the allowed range", code: "INVALID_COORDINATE", field });
  }
}

function addDuplicateErrors(
  values: readonly string[],
  field: string[],
  childField: string | undefined,
  errors: Array<{ message: string; code: string; field?: string[] }>
) {
  const seen = new Set<string>();
  for (const [index, value] of values.entries()) {
    if (seen.has(value)) {
      errors.push({
        message: "Duplicate address ID",
        code: "DUPLICATE_ID",
        field: [...field, String(index), ...(childField ? [childField] : [])],
      });
    }
    seen.add(value);
  }
}
