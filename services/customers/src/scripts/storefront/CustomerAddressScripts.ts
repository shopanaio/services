import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { CustomerAddressPatch } from "../../repositories/address/CustomerAddressRepository.js";
import {
  failedCustomerMutation,
  internalStorefrontError,
  revisionAcquireError,
  storefrontError,
  validateStorefrontExpectedRevision,
  type StorefrontCustomerMutationResult,
  type StorefrontCustomerReference,
  type StorefrontCustomerUserError,
} from "./types.js";

export interface StorefrontCustomerAddressInput {
  label?: string | null;
  prefix?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  suffix?: string | null;
  company?: string | null;
  address1: string;
  address2?: string | null;
  city: string;
  countryCode: string;
  provinceCode?: string | null;
  zip?: string | null;
  phone?: string | null;
}

interface AddressMutationResult extends StorefrontCustomerMutationResult {
  customerAddress: { id: string } | null;
}

export interface StorefrontCustomerAddressCreateParams {
  customerId: string;
  address: StorefrontCustomerAddressInput;
  defaultShipping?: boolean | null;
  defaultBilling?: boolean | null;
  expectedRevision: number;
}

export type StorefrontCustomerAddressCreateResult = AddressMutationResult;

export interface StorefrontCustomerAddressUpdateParams {
  customerId: string;
  addressId: string;
  address: StorefrontCustomerAddressInput;
  defaultShipping?: boolean | null;
  defaultBilling?: boolean | null;
  expectedRevision: number;
}

export type StorefrontCustomerAddressUpdateResult = AddressMutationResult;

export interface StorefrontCustomerAddressDeleteParams {
  customerId: string;
  addressId: string;
  expectedRevision: number;
}

export interface StorefrontCustomerAddressDeleteResult extends StorefrontCustomerMutationResult {
  deletedAddressId: string | null;
}

export type StorefrontCustomerAddressDefaultType = "SHIPPING" | "BILLING";

export interface StorefrontCustomerAddressDefaultSetParams {
  customerId: string;
  addressId?: string | null;
  defaults: StorefrontCustomerAddressDefaultType[];
  expectedRevision: number;
}

export type StorefrontCustomerAddressDefaultSetResult = StorefrontCustomerMutationResult;

export class StorefrontCustomerAddressCreateScript extends BaseScript<
  StorefrontCustomerAddressCreateParams,
  StorefrontCustomerAddressCreateResult
> {
  @Transactional()
  protected async execute(
    params: StorefrontCustomerAddressCreateParams,
  ): Promise<StorefrontCustomerAddressCreateResult> {
    const errors = validateAddressCommand(params.expectedRevision, params.address);
    if (errors.length > 0) return failedAddressMutation(...errors);

    const acquired = await this.repository.customer.acquireActiveRevision(
      params.customerId,
      params.expectedRevision,
    );
    if (acquired.status !== "acquired") {
      return failedAddressMutation(revisionAcquireError(acquired));
    }

    const address = await this.repository.address.create({
      ...addressPatch(params.address),
      customerId: params.customerId,
      isDefaultShipping: params.defaultShipping === true,
      isDefaultBilling: params.defaultBilling === true,
    });
    await this.invalidateDynamicSegments(params.customerId, ["address"], "storefrontAddressCreate");
    return successfulAddressMutation(address.id, acquired.customer.id, acquired.customer.revision);
  }

  protected handleError(_error: unknown): StorefrontCustomerAddressCreateResult {
    return failedAddressMutation(internalStorefrontError());
  }
}

export class StorefrontCustomerAddressUpdateScript extends BaseScript<
  StorefrontCustomerAddressUpdateParams,
  StorefrontCustomerAddressUpdateResult
> {
  @Transactional()
  protected async execute(
    params: StorefrontCustomerAddressUpdateParams,
  ): Promise<StorefrontCustomerAddressUpdateResult> {
    const errors = validateAddressCommand(params.expectedRevision, params.address);
    const current = await this.repository.address.findOwnedById(
      params.customerId,
      params.addressId,
    );
    if (!current) {
      errors.push(storefrontError("NOT_FOUND", "Address was not found", ["addressId"]));
    }
    if (errors.length > 0 || !current) {
      return failedAddressMutation(...errors);
    }

    const [shipping, billing] = await Promise.all([
      this.repository.address.findDefaultShipping(params.customerId),
      this.repository.address.findDefaultBilling(params.customerId),
    ]);
    const acquired = await this.repository.customer.acquireActiveRevision(
      params.customerId,
      params.expectedRevision,
    );
    if (acquired.status !== "acquired") {
      return failedAddressMutation(revisionAcquireError(acquired));
    }

    const updated = await this.repository.address.updateOwned(
      params.customerId,
      params.addressId,
      addressPatch(params.address),
    );
    if (!updated) throw new Error("Owned address disappeared during update");

    if (typeof params.defaultShipping === "boolean" || typeof params.defaultBilling === "boolean") {
      const defaultsUpdated = await this.repository.address.setDefaults(params.customerId, {
        shippingAddressId: selectDefault(
          shipping?.id ?? null,
          params.addressId,
          params.defaultShipping,
        ),
        billingAddressId: selectDefault(
          billing?.id ?? null,
          params.addressId,
          params.defaultBilling,
        ),
      });
      if (!defaultsUpdated) throw new Error("Address defaults could not be set");
    }

    await this.invalidateDynamicSegments(params.customerId, ["address"], "storefrontAddressUpdate");

    return successfulAddressMutation(updated.id, acquired.customer.id, acquired.customer.revision);
  }

  protected handleError(_error: unknown): StorefrontCustomerAddressUpdateResult {
    return failedAddressMutation(internalStorefrontError());
  }
}

export class StorefrontCustomerAddressDeleteScript extends BaseScript<
  StorefrontCustomerAddressDeleteParams,
  StorefrontCustomerAddressDeleteResult
> {
  @Transactional()
  protected async execute(
    params: StorefrontCustomerAddressDeleteParams,
  ): Promise<StorefrontCustomerAddressDeleteResult> {
    const revisionError = validateStorefrontExpectedRevision(params.expectedRevision);
    if (revisionError) return failedAddressDelete(revisionError);
    const current = await this.repository.address.findOwnedById(
      params.customerId,
      params.addressId,
    );
    if (!current) {
      return failedAddressDelete(
        storefrontError("NOT_FOUND", "Address was not found", ["addressId"]),
      );
    }

    const acquired = await this.repository.customer.acquireActiveRevision(
      params.customerId,
      params.expectedRevision,
    );
    if (acquired.status !== "acquired") {
      return failedAddressDelete(revisionAcquireError(acquired));
    }
    if (!(await this.repository.address.softDeleteOwned(params.customerId, params.addressId))) {
      throw new Error("Owned address disappeared during delete");
    }
    await this.invalidateDynamicSegments(params.customerId, ["address"], "storefrontAddressDelete");
    return {
      deletedAddressId: params.addressId,
      customer: customerReference(acquired.customer.id, acquired.customer.revision),
      updatedReasons: ["address"],
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): StorefrontCustomerAddressDeleteResult {
    return failedAddressDelete(internalStorefrontError());
  }
}

export class StorefrontCustomerAddressDefaultSetScript extends BaseScript<
  StorefrontCustomerAddressDefaultSetParams,
  StorefrontCustomerAddressDefaultSetResult
> {
  @Transactional()
  protected async execute(
    params: StorefrontCustomerAddressDefaultSetParams,
  ): Promise<StorefrontCustomerAddressDefaultSetResult> {
    const errors: StorefrontCustomerUserError[] = [];
    const revisionError = validateStorefrontExpectedRevision(params.expectedRevision);
    if (revisionError) errors.push(revisionError);
    const defaults = new Set(params.defaults);
    if (defaults.size === 0) {
      errors.push(
        storefrontError("INVALID_DEFAULTS", "At least one address default must be selected", [
          "defaults",
        ]),
      );
    }
    if (defaults.size !== params.defaults.length) {
      errors.push(
        storefrontError("DUPLICATE_DEFAULT", "An address default can be selected only once", [
          "defaults",
        ]),
      );
    }
    if ([...defaults].some((value) => !["SHIPPING", "BILLING"].includes(value))) {
      errors.push(storefrontError("INVALID_DEFAULTS", "Unknown address default", ["defaults"]));
    }
    if (
      params.addressId &&
      !(await this.repository.address.findOwnedById(params.customerId, params.addressId))
    ) {
      errors.push(storefrontError("NOT_FOUND", "Address was not found", ["addressId"]));
    }
    if (errors.length > 0) return failedCustomerMutation(...errors);

    const [shipping, billing] = await Promise.all([
      this.repository.address.findDefaultShipping(params.customerId),
      this.repository.address.findDefaultBilling(params.customerId),
    ]);
    const acquired = await this.repository.customer.acquireActiveRevision(
      params.customerId,
      params.expectedRevision,
    );
    if (acquired.status !== "acquired") {
      return failedCustomerMutation(revisionAcquireError(acquired));
    }

    const updated = await this.repository.address.setDefaults(params.customerId, {
      shippingAddressId: defaults.has("SHIPPING")
        ? (params.addressId ?? null)
        : (shipping?.id ?? null),
      billingAddressId: defaults.has("BILLING")
        ? (params.addressId ?? null)
        : (billing?.id ?? null),
    });
    if (!updated) throw new Error("Address defaults could not be set");
    await this.invalidateDynamicSegments(
      params.customerId,
      ["address"],
      "storefrontAddressDefault",
    );
    return {
      customer: customerReference(acquired.customer.id, acquired.customer.revision),
      updatedReasons: ["address"],
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): StorefrontCustomerAddressDefaultSetResult {
    return failedCustomerMutation(internalStorefrontError());
  }
}

function validateAddressCommand(
  expectedRevision: number,
  address: StorefrontCustomerAddressInput,
): StorefrontCustomerUserError[] {
  const errors: StorefrontCustomerUserError[] = [];
  const revisionError = validateStorefrontExpectedRevision(expectedRevision);
  if (revisionError) errors.push(revisionError);
  for (const field of ["address1", "city", "countryCode"] as const) {
    if (!address[field]?.trim()) {
      errors.push(storefrontError("INVALID_VALUE", "Value cannot be empty", ["address", field]));
    }
  }
  if (!/^[A-Z]{2}$/i.test(address.countryCode.trim())) {
    errors.push(
      storefrontError("INVALID_COUNTRY_CODE", "Country code must contain two letters", [
        "address",
        "countryCode",
      ]),
    );
  }
  if (address.phone && !/^\+[1-9][0-9]{6,14}$/.test(address.phone.trim())) {
    errors.push(
      storefrontError("INVALID_PHONE", "Phone number must use E.164 format", ["address", "phone"]),
    );
  }
  for (const [field, limit] of Object.entries({
    label: 64,
    prefix: 32,
    firstName: 128,
    middleName: 128,
    lastName: 128,
    suffix: 32,
    company: 255,
    address1: 255,
    address2: 255,
    city: 128,
    provinceCode: 64,
    zip: 32,
    phone: 32,
  }) as Array<[keyof StorefrontCustomerAddressInput, number]>) {
    const value = address[field];
    if (typeof value === "string" && [...value.trim()].length > limit) {
      errors.push(
        storefrontError("INVALID_VALUE", `Value must not exceed ${limit} characters`, [
          "address",
          field,
        ]),
      );
    }
  }
  return errors;
}

function addressPatch(input: StorefrontCustomerAddressInput): CustomerAddressPatch & {
  address1: string;
  city: string;
  countryCode: string;
} {
  return {
    label: nullable(input.label),
    prefix: nullable(input.prefix),
    firstName: nullable(input.firstName),
    middleName: nullable(input.middleName),
    lastName: nullable(input.lastName),
    suffix: nullable(input.suffix),
    companyName: nullable(input.company),
    phoneE164: nullable(input.phone),
    address1: input.address1.trim(),
    address2: nullable(input.address2),
    city: input.city.trim(),
    regionName: null,
    regionCode: nullable(input.provinceCode),
    postalCode: nullable(input.zip),
    countryCode: input.countryCode.trim().toUpperCase(),
    validationStatus: "UNVALIDATED",
    validatedAt: null,
    latitude: null,
    longitude: null,
  };
}

function nullable(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

function selectDefault(
  currentId: string | null,
  addressId: string,
  desired: boolean | null | undefined,
): string | null {
  if (typeof desired !== "boolean") return currentId;
  if (desired) return addressId;
  return currentId === addressId ? null : currentId;
}

function customerReference(id: string, revision: number): StorefrontCustomerReference {
  return { id, revision };
}

function successfulAddressMutation(
  addressId: string,
  customerId: string,
  revision: number,
): AddressMutationResult {
  return {
    customerAddress: { id: addressId },
    customer: customerReference(customerId, revision),
    updatedReasons: ["address"],
    userErrors: [],
  };
}

function failedAddressMutation(
  ...userErrors: StorefrontCustomerUserError[]
): AddressMutationResult {
  return {
    customerAddress: null,
    customer: null,
    updatedReasons: [],
    userErrors,
  };
}

function failedAddressDelete(
  ...userErrors: StorefrontCustomerUserError[]
): StorefrontCustomerAddressDeleteResult {
  return {
    deletedAddressId: null,
    customer: null,
    updatedReasons: [],
    userErrors,
  };
}
