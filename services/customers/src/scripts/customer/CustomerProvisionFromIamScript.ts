import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { Customer } from "../../repositories/models/index.js";

export interface CustomerProvisionFromIamParams {
  readonly iamPrincipalId: string;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly firstName: string | null;
  readonly lastName: string | null;
}

export interface CustomerProvisionFromIamResult {
  readonly customerId: string;
  readonly created: boolean;
  readonly updated: boolean;
}

export class CustomerProvisioningError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "CustomerProvisioningError";
  }
}

export class CustomerProvisionFromIamScript extends BaseScript<
  CustomerProvisionFromIamParams,
  CustomerProvisionFromIamResult
> {
  @Transactional()
  protected async execute(
    params: CustomerProvisionFromIamParams,
  ): Promise<CustomerProvisionFromIamResult> {
    const existingByPrincipal =
      await this.repository.customer.findByIamPrincipalIdIncludingDeleted(
        params.iamPrincipalId,
      );
    if (existingByPrincipal) {
      return this.synchronizeExisting(existingByPrincipal, params);
    }

    const existingByEmail = await this.repository.customer.findByEmail(
      params.email,
    );
    if (existingByEmail) {
      return this.claimExistingEmail(existingByEmail, params);
    }

    const created = await this.repository.customer.createIfAbsent({
      iamPrincipalId: params.iamPrincipalId,
      accountStatus: "REGISTERED",
      email: params.email,
      emailVerified: params.emailVerified,
      firstName: params.firstName,
      lastName: params.lastName,
      source: "iam_application_signup",
    });
    if (created) {
      return {
        customerId: created.id,
        created: true,
        updated: false,
      };
    }

    const racedByPrincipal =
      await this.repository.customer.findByIamPrincipalIdIncludingDeleted(
        params.iamPrincipalId,
      );
    if (racedByPrincipal) {
      return this.synchronizeExisting(racedByPrincipal, params);
    }
    const racedByEmail = await this.repository.customer.findByEmail(params.email);
    if (racedByEmail) {
      return this.claimExistingEmail(racedByEmail, params);
    }

    throw new CustomerProvisioningError(
      "Customer provisioning conflicted with another write",
      "CUSTOMER_PROVISION_CONFLICT",
      true,
    );
  }

  protected handleError(error: unknown): CustomerProvisionFromIamResult {
    throw error;
  }

  private async claimExistingEmail(
    customer: Customer,
    params: CustomerProvisionFromIamParams,
  ): Promise<CustomerProvisionFromIamResult> {
    if (customer.iamPrincipalId === params.iamPrincipalId) {
      return this.synchronizeExisting(customer, params);
    }
    if (customer.iamPrincipalId) {
      throw new CustomerProvisioningError(
        "Customer email is already linked to another IAM principal",
        "CUSTOMER_EMAIL_PRINCIPAL_CONFLICT",
        false,
      );
    }
    if (customer.lifecycleStatus !== "ACTIVE") {
      throw new CustomerProvisioningError(
        "Customer email belongs to an inactive customer",
        "CUSTOMER_EMAIL_TARGET_INACTIVE",
        false,
      );
    }
    if (!params.emailVerified) {
      throw new CustomerProvisioningError(
        "Verified email is required to claim an existing customer",
        "CUSTOMER_EMAIL_CLAIM_REQUIRES_VERIFICATION",
        false,
      );
    }

    const claimed = await this.repository.customer.claimIamPrincipal(
      customer.id,
      {
        ...params,
        firstName: customer.firstName ?? params.firstName,
        lastName: customer.lastName ?? params.lastName,
      },
    );
    if (claimed) {
      return {
        customerId: claimed.id,
        created: false,
        updated: true,
      };
    }

    const raced =
      await this.repository.customer.findByIamPrincipalIdIncludingDeleted(
        params.iamPrincipalId,
      );
    if (raced) return this.synchronizeExisting(raced, params);

    throw new CustomerProvisioningError(
      "Customer identity claim conflicted with another write",
      "CUSTOMER_IDENTITY_CLAIM_CONFLICT",
      true,
    );
  }

  private async synchronizeExisting(
    customer: Customer,
    params: CustomerProvisionFromIamParams,
  ): Promise<CustomerProvisionFromIamResult> {
    if (customer.deletedAt) {
      throw new CustomerProvisioningError(
        "IAM principal belongs to a deleted customer",
        "CUSTOMER_PRINCIPAL_DELETED",
        false,
      );
    }
    if (customer.lifecycleStatus !== "ACTIVE") {
      return {
        customerId: customer.id,
        created: false,
        updated: false,
      };
    }
    if (
      customer.normalizedEmail !== normalizeEmail(params.email) &&
      !params.emailVerified
    ) {
      throw new CustomerProvisioningError(
        "Verified email is required to change the customer identity email",
        "CUSTOMER_EMAIL_CHANGE_REQUIRES_VERIFICATION",
        false,
      );
    }
    if (customer.normalizedEmail !== normalizeEmail(params.email)) {
      const conflictingCustomer =
        await this.repository.customer.findByEmail(params.email);
      if (conflictingCustomer && conflictingCustomer.id !== customer.id) {
        throw new CustomerProvisioningError(
          "Customer email is already used by another customer",
          "CUSTOMER_EMAIL_CONFLICT",
          false,
        );
      }
    }

    const patch = {
      ...(customer.accountStatus !== "REGISTERED"
        ? { accountStatus: "REGISTERED" as const }
        : {}),
      ...(customer.normalizedEmail !== normalizeEmail(params.email)
        ? { email: params.email }
        : {}),
      ...(customer.emailVerified !== params.emailVerified
        ? { emailVerified: params.emailVerified }
        : {}),
      ...(customer.firstName === null && params.firstName
        ? { firstName: params.firstName }
        : {}),
      ...(customer.lastName === null && params.lastName
        ? { lastName: params.lastName }
        : {}),
    };
    if (Object.keys(patch).length === 0) {
      return {
        customerId: customer.id,
        created: false,
        updated: false,
      };
    }

    const updated = await this.repository.customer.update(customer.id, patch);
    if (!updated) {
      throw new CustomerProvisioningError(
        "Customer disappeared during IAM synchronization",
        "CUSTOMER_PROVISION_TARGET_MISSING",
        true,
      );
    }
    return {
      customerId: updated.id,
      created: false,
      updated: true,
    };
  }
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}
