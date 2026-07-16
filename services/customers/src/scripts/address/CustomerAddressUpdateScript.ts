import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { UserError } from "../../kernel/BaseScript.js";
import type { CustomerAddressPatch } from "../../repositories/address/CustomerAddressRepository.js";

export interface CustomerAddressUpdateParams {
  id: string;
  operations: {
    label?: string | null;
    prefix?: string | null;
    firstName?: string | null;
    middleName?: string | null;
    lastName?: string | null;
    suffix?: string | null;
    companyName?: string | null;
    phoneE164?: string | null;
    address1?: string | null;
    address2?: string | null;
    city?: string | null;
    regionName?: string | null;
    regionCode?: string | null;
    postalCode?: string | null;
    countryCode?: string | null;
    isDefaultShipping?: boolean | null;
    isDefaultBilling?: boolean | null;
    latitude?: number | null;
    longitude?: number | null;
  };
}

export interface CustomerAddressUpdateResult {
  address?: { id: string };
  customerId?: string;
  userErrors: UserError[];
}

export class CustomerAddressUpdateScript extends BaseScript<
  CustomerAddressUpdateParams,
  CustomerAddressUpdateResult
> {
  @Transactional()
  protected async execute(
    params: CustomerAddressUpdateParams
  ): Promise<CustomerAddressUpdateResult> {
    const current = await this.repository.address.findById(params.id);
    if (!current) return notFound();

    const errors = validateAddressUpdate(current, params.operations);
    if (errors.length > 0) {
      return { address: undefined, customerId: current.customerId, userErrors: errors };
    }

    const patch = addressPatch(params.operations);
    if (Object.keys(patch).length > 0) {
      const updated = await this.repository.address.update(params.id, patch);
      if (!updated) return notFound();
    }

    const updatesShipping = hasOwn(params.operations, "isDefaultShipping");
    const updatesBilling = hasOwn(params.operations, "isDefaultBilling");
    if (updatesShipping || updatesBilling) {
      const [currentShipping, currentBilling] = await Promise.all([
        this.repository.address.findDefaultShipping(current.customerId),
        this.repository.address.findDefaultBilling(current.customerId),
      ]);
      const defaultsUpdated = await this.repository.address.setDefaults(
        current.customerId,
        {
          shippingAddressId: updatesShipping
            ? params.operations.isDefaultShipping
              ? params.id
              : currentShipping?.id === params.id
                ? null
                : currentShipping?.id ?? null
            : currentShipping?.id ?? null,
          billingAddressId: updatesBilling
            ? params.operations.isDefaultBilling
              ? params.id
              : currentBilling?.id === params.id
                ? null
                : currentBilling?.id ?? null
            : currentBilling?.id ?? null,
        }
      );
      if (!defaultsUpdated) return notFound();
    }

    this.logger.info(
      { addressId: params.id, customerId: current.customerId },
      "Customer address updated"
    );
    return {
      address: { id: params.id },
      customerId: current.customerId,
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): CustomerAddressUpdateResult {
    return {
      address: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

function validateAddressUpdate(
  current: {
    address1: string;
    city: string;
    countryCode: string;
    phoneE164: string | null;
    latitude: string | null;
    longitude: string | null;
  },
  operations: CustomerAddressUpdateParams["operations"]
): UserError[] {
  const errors: UserError[] = [];
  const address1 = hasOwn(operations, "address1")
    ? operations.address1
    : current.address1;
  const city = hasOwn(operations, "city") ? operations.city : current.city;
  const countryCode = hasOwn(operations, "countryCode")
    ? operations.countryCode
    : current.countryCode;
  const phoneE164 = hasOwn(operations, "phoneE164")
    ? operations.phoneE164
    : current.phoneE164;
  const latitude = hasOwn(operations, "latitude")
    ? operations.latitude
    : current.latitude == null
      ? null
      : Number(current.latitude);
  const longitude = hasOwn(operations, "longitude")
    ? operations.longitude
    : current.longitude == null
      ? null
      : Number(current.longitude);

  for (const field of ["isDefaultShipping", "isDefaultBilling"] as const) {
    if (hasOwn(operations, field) && operations[field] == null) {
      errors.push({
        message: "Default flag cannot be null",
        code: "INVALID_VALUE",
        field: [field],
      });
    }
  }

  for (const [field, value] of [
    ["address1", address1],
    ["city", city],
  ] as const) {
    if (value == null || value.trim().length === 0) {
      errors.push({
        message: "Value cannot be empty",
        code: "INVALID_VALUE",
        field: [field],
      });
    }
  }
  if (countryCode == null || !/^[A-Za-z]{2}$/.test(countryCode.trim())) {
    errors.push({
      message: "Country code must use ISO 3166-1 alpha-2 format",
      code: "INVALID_COUNTRY_CODE",
      field: ["countryCode"],
    });
  }
  if (phoneE164 && !/^\+[1-9][0-9]{6,14}$/.test(phoneE164)) {
    errors.push({
      message: "Phone number must use E.164 format",
      code: "INVALID_PHONE",
      field: ["phoneE164"],
    });
  }
  if ((latitude == null) !== (longitude == null)) {
    errors.push({
      message: "Latitude and longitude must be provided together",
      code: "INVALID_COORDINATES",
      field: [latitude == null ? "latitude" : "longitude"],
    });
  }
  if (latitude != null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) {
    errors.push({
      message: "Latitude must be between -90 and 90",
      code: "INVALID_COORDINATES",
      field: ["latitude"],
    });
  }
  if (
    longitude != null &&
    (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)
  ) {
    errors.push({
      message: "Longitude must be between -180 and 180",
      code: "INVALID_COORDINATES",
      field: ["longitude"],
    });
  }
  return errors;
}

function addressPatch(
  operations: CustomerAddressUpdateParams["operations"]
): CustomerAddressPatch {
  const patch: CustomerAddressPatch = {};
  for (const field of [
    "label",
    "prefix",
    "firstName",
    "middleName",
    "lastName",
    "suffix",
    "companyName",
    "phoneE164",
    "address1",
    "address2",
    "city",
    "regionName",
    "regionCode",
    "postalCode",
    "countryCode",
    "latitude",
    "longitude",
  ] as const) {
    if (hasOwn(operations, field)) {
      Object.assign(patch, { [field]: operations[field] });
    }
  }
  return patch;
}

function hasOwn(value: object, field: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, field);
}

function notFound(): CustomerAddressUpdateResult {
  return {
    address: undefined,
    userErrors: [
      {
        message: "Customer address not found",
        field: ["addressId"],
        code: "NOT_FOUND",
      },
    ],
  };
}
