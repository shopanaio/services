import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import { normalizeTaxIdentifier } from "../../repositories/tax/CustomerTaxIdentifierRepository.js";
import {
  failedCustomerMutation,
  internalStorefrontError,
  revisionAcquireError,
  storefrontError,
  validateStorefrontExpectedRevision,
  type StorefrontCustomerMutationResult,
  type StorefrontCustomerUserError,
} from "./types.js";

interface TaxIdentifierMutationResult extends StorefrontCustomerMutationResult {
  taxIdentifier: { id: string } | null;
}

export interface StorefrontCustomerTaxIdentifierCreateParams {
  customerId: string;
  identifierType: string;
  countryCode?: string | null;
  value: string;
  isPrimary?: boolean | null;
  expectedRevision: number;
}

export type StorefrontCustomerTaxIdentifierCreateResult = TaxIdentifierMutationResult;

export interface StorefrontCustomerTaxIdentifierUpdateParams {
  customerId: string;
  taxIdentifierId: string;
  identifierType?: string | null;
  countryCode?: string | null;
  value?: string | null;
  isPrimary?: boolean | null;
  expectedRevision: number;
}

export type StorefrontCustomerTaxIdentifierUpdateResult = TaxIdentifierMutationResult;

export interface StorefrontCustomerTaxIdentifierDeleteParams {
  customerId: string;
  taxIdentifierId: string;
  expectedRevision: number;
}

export interface StorefrontCustomerTaxIdentifierDeleteResult extends StorefrontCustomerMutationResult {
  deletedTaxIdentifierId: string | null;
}

export class StorefrontCustomerTaxIdentifierCreateScript extends BaseScript<
  StorefrontCustomerTaxIdentifierCreateParams,
  StorefrontCustomerTaxIdentifierCreateResult
> {
  @Transactional()
  protected async execute(
    params: StorefrontCustomerTaxIdentifierCreateParams,
  ): Promise<StorefrontCustomerTaxIdentifierCreateResult> {
    const errors = validateIdentifier(
      params.expectedRevision,
      params.identifierType,
      params.countryCode,
      params.value,
    );
    if (errors.length === 0 && (await this.repository.taxIdentifier.findDuplicate(params))) {
      errors.push(duplicateError());
    }
    if (errors.length > 0) return failedIdentifier(...errors);

    const acquired = await this.repository.customer.acquireActiveRevision(
      params.customerId,
      params.expectedRevision,
    );
    if (acquired.status !== "acquired") {
      return failedIdentifier(revisionAcquireError(acquired));
    }
    const identifier = await this.repository.taxIdentifier.create({
      customerId: params.customerId,
      identifierType: params.identifierType,
      countryCode: params.countryCode ?? null,
      value: params.value,
      status: "UNVERIFIED",
      isPrimary: params.isPrimary === true,
    });
    await this.invalidateDynamicSegments(
      params.customerId,
      ["taxIdentifier"],
      "storefrontTaxIdentifierCreate",
    );
    return successfulIdentifier(identifier.id, acquired.customer.id, acquired.customer.revision);
  }

  protected handleError(_error: unknown): StorefrontCustomerTaxIdentifierCreateResult {
    return failedIdentifier(internalStorefrontError());
  }
}

export class StorefrontCustomerTaxIdentifierUpdateScript extends BaseScript<
  StorefrontCustomerTaxIdentifierUpdateParams,
  StorefrontCustomerTaxIdentifierUpdateResult
> {
  @Transactional()
  protected async execute(
    params: StorefrontCustomerTaxIdentifierUpdateParams,
  ): Promise<StorefrontCustomerTaxIdentifierUpdateResult> {
    const revisionError = validateStorefrontExpectedRevision(params.expectedRevision);
    if (revisionError) return failedIdentifier(revisionError);
    const current = await this.repository.taxIdentifier.findOwnedById(
      params.customerId,
      params.taxIdentifierId,
    );
    if (!current) {
      return failedIdentifier(
        storefrontError("NOT_FOUND", "Tax identifier was not found", ["taxIdentifierId"]),
      );
    }

    const identifierType = params.identifierType ?? current.identifierType;
    const countryCode = params.countryCode === undefined ? current.countryCode : params.countryCode;
    const value = params.value ?? current.value;
    const errors = validateIdentifier(params.expectedRevision, identifierType, countryCode, value);
    if (
      errors.length === 0 &&
      (await this.repository.taxIdentifier.findDuplicate({
        customerId: params.customerId,
        identifierType,
        countryCode,
        value,
        exceptId: params.taxIdentifierId,
      }))
    ) {
      errors.push(duplicateError());
    }
    if (errors.length > 0) return failedIdentifier(...errors);

    const acquired = await this.repository.customer.acquireActiveRevision(
      params.customerId,
      params.expectedRevision,
    );
    if (acquired.status !== "acquired") {
      return failedIdentifier(revisionAcquireError(acquired));
    }

    const identityChanged =
      identifierType.trim() !== current.identifierType ||
      (countryCode?.trim().toUpperCase() ?? null) !== current.countryCode ||
      normalizeTaxIdentifier(value) !== current.normalizedValue;
    const updated = await this.repository.taxIdentifier.updateOwned(
      params.customerId,
      params.taxIdentifierId,
      {
        ...(params.identifierType !== undefined ? { identifierType } : {}),
        ...(params.countryCode !== undefined ? { countryCode } : {}),
        ...(params.value !== undefined ? { value } : {}),
        ...(typeof params.isPrimary === "boolean" ? { isPrimary: params.isPrimary } : {}),
        ...(identityChanged ? { status: "UNVERIFIED" as const } : {}),
      },
    );
    if (!updated) throw new Error("Owned tax identifier disappeared during update");
    await this.invalidateDynamicSegments(
      params.customerId,
      ["taxIdentifier"],
      "storefrontTaxIdentifierUpdate",
    );
    return successfulIdentifier(updated.id, acquired.customer.id, acquired.customer.revision);
  }

  protected handleError(_error: unknown): StorefrontCustomerTaxIdentifierUpdateResult {
    return failedIdentifier(internalStorefrontError());
  }
}

export class StorefrontCustomerTaxIdentifierDeleteScript extends BaseScript<
  StorefrontCustomerTaxIdentifierDeleteParams,
  StorefrontCustomerTaxIdentifierDeleteResult
> {
  @Transactional()
  protected async execute(
    params: StorefrontCustomerTaxIdentifierDeleteParams,
  ): Promise<StorefrontCustomerTaxIdentifierDeleteResult> {
    const revisionError = validateStorefrontExpectedRevision(params.expectedRevision);
    if (revisionError) return failedDelete(revisionError);
    if (
      !(await this.repository.taxIdentifier.findOwnedById(
        params.customerId,
        params.taxIdentifierId,
      ))
    ) {
      return failedDelete(
        storefrontError("NOT_FOUND", "Tax identifier was not found", ["taxIdentifierId"]),
      );
    }

    const acquired = await this.repository.customer.acquireActiveRevision(
      params.customerId,
      params.expectedRevision,
    );
    if (acquired.status !== "acquired") {
      return failedDelete(revisionAcquireError(acquired));
    }
    if (
      !(await this.repository.taxIdentifier.softDeleteOwned(
        params.customerId,
        params.taxIdentifierId,
      ))
    ) {
      throw new Error("Owned tax identifier disappeared during delete");
    }
    await this.invalidateDynamicSegments(
      params.customerId,
      ["taxIdentifier"],
      "storefrontTaxIdentifierDelete",
    );
    return {
      deletedTaxIdentifierId: params.taxIdentifierId,
      customer: {
        id: acquired.customer.id,
        revision: acquired.customer.revision,
      },
      updatedReasons: ["taxIdentifier"],
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): StorefrontCustomerTaxIdentifierDeleteResult {
    return failedDelete(internalStorefrontError());
  }
}

function validateIdentifier(
  expectedRevision: number,
  identifierType: string,
  countryCode: string | null | undefined,
  value: string,
): StorefrontCustomerUserError[] {
  const errors: StorefrontCustomerUserError[] = [];
  const revisionError = validateStorefrontExpectedRevision(expectedRevision);
  if (revisionError) errors.push(revisionError);
  if (!identifierType.trim() || [...identifierType.trim()].length > 64) {
    errors.push(
      storefrontError(
        "INVALID_IDENTIFIER_TYPE",
        "Identifier type must contain between 1 and 64 characters",
        ["identifierType"],
      ),
    );
  }
  if (!value.trim() || [...value.trim()].length > 255) {
    errors.push(
      storefrontError(
        "INVALID_VALUE",
        "Identifier value must contain between 1 and 255 characters",
        ["value"],
      ),
    );
  }
  if (countryCode != null && !/^[A-Z]{2}$/i.test(countryCode.trim())) {
    errors.push(
      storefrontError("INVALID_COUNTRY_CODE", "Country code must contain two letters", [
        "countryCode",
      ]),
    );
  }
  return errors;
}

function duplicateError(): StorefrontCustomerUserError {
  return storefrontError("TAX_IDENTIFIER_ALREADY_EXISTS", "This tax identifier already exists", [
    "value",
  ]);
}

function successfulIdentifier(
  id: string,
  customerId: string,
  revision: number,
): TaxIdentifierMutationResult {
  return {
    taxIdentifier: { id },
    customer: { id: customerId, revision },
    updatedReasons: ["taxIdentifier"],
    userErrors: [],
  };
}

function failedIdentifier(
  ...userErrors: StorefrontCustomerUserError[]
): TaxIdentifierMutationResult {
  return {
    taxIdentifier: null,
    ...failedCustomerMutation(...userErrors),
  };
}

function failedDelete(
  ...userErrors: StorefrontCustomerUserError[]
): StorefrontCustomerTaxIdentifierDeleteResult {
  return {
    deletedTaxIdentifierId: null,
    ...failedCustomerMutation(...userErrors),
  };
}
