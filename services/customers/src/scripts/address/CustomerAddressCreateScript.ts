import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { UserError } from "../../kernel/BaseScript.js";

export interface CustomerAddressCreateParams {
  customerId: string;
  label?: string | null;
  prefix?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  suffix?: string | null;
  companyName?: string | null;
  phoneE164?: string | null;
  address1: string;
  address2?: string | null;
  city: string;
  regionName?: string | null;
  regionCode?: string | null;
  postalCode?: string | null;
  countryCode: string;
  isDefaultShipping?: boolean;
  isDefaultBilling?: boolean;
  latitude?: number | null;
  longitude?: number | null;
}

export interface CustomerAddressCreateResult {
  address?: { id: string };
  userErrors: UserError[];
}

export class CustomerAddressCreateScript extends BaseScript<
  CustomerAddressCreateParams,
  CustomerAddressCreateResult
> {
  @Transactional()
  protected async execute(
    params: CustomerAddressCreateParams
  ): Promise<CustomerAddressCreateResult> {
    const errors = validateAddress(params);
    if (!(await this.repository.customer.exists(params.customerId))) {
      errors.push({
        message: "Customer not found",
        code: "NOT_FOUND",
        field: ["customerId"],
      });
    }
    if (errors.length > 0) {
      return { address: undefined, userErrors: errors };
    }

    const address = await this.repository.address.create({
      ...params,
      address1: params.address1.trim(),
      city: params.city.trim(),
      countryCode: params.countryCode.trim(),
      isDefaultShipping: params.isDefaultShipping ?? false,
      isDefaultBilling: params.isDefaultBilling ?? false,
    });
    this.logger.info(
      { addressId: address.id, customerId: params.customerId },
      "Customer address created"
    );
    return { address: { id: address.id }, userErrors: [] };
  }

  protected handleError(_error: unknown): CustomerAddressCreateResult {
    return {
      address: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

function validateAddress(params: CustomerAddressCreateParams): UserError[] {
  const errors: UserError[] = [];
  validateRequired(params.address1, "address1", errors);
  validateRequired(params.city, "city", errors);

  if (!/^[A-Za-z]{2}$/.test(params.countryCode.trim())) {
    errors.push({
      message: "Country code must use ISO 3166-1 alpha-2 format",
      code: "INVALID_COUNTRY_CODE",
      field: ["countryCode"],
    });
  }
  if (params.phoneE164 && !/^\+[1-9][0-9]{6,14}$/.test(params.phoneE164)) {
    errors.push({
      message: "Phone number must use E.164 format",
      code: "INVALID_PHONE",
      field: ["phoneE164"],
    });
  }

  const hasLatitude = params.latitude != null;
  const hasLongitude = params.longitude != null;
  if (hasLatitude !== hasLongitude) {
    errors.push({
      message: "Latitude and longitude must be provided together",
      code: "INVALID_COORDINATES",
      field: [hasLatitude ? "longitude" : "latitude"],
    });
  }
  if (
    params.latitude != null &&
    (!Number.isFinite(params.latitude) || params.latitude < -90 || params.latitude > 90)
  ) {
    errors.push({
      message: "Latitude must be between -90 and 90",
      code: "INVALID_COORDINATES",
      field: ["latitude"],
    });
  }
  if (
    params.longitude != null &&
    (!Number.isFinite(params.longitude) ||
      params.longitude < -180 ||
      params.longitude > 180)
  ) {
    errors.push({
      message: "Longitude must be between -180 and 180",
      code: "INVALID_COORDINATES",
      field: ["longitude"],
    });
  }
  return errors;
}

function validateRequired(
  value: string,
  field: string,
  errors: UserError[]
): void {
  if (value.trim().length === 0) {
    errors.push({
      message: "Value cannot be empty",
      code: "INVALID_VALUE",
      field: [field],
    });
  }
}
