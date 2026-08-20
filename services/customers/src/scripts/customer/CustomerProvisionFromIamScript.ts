import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { Customer } from "../../repositories/models/index.js";

export interface CustomerProvisionFromIamParams {
  readonly iamPrincipalId: string;
  readonly iamStatus: "active" | "blocked";
  readonly email: string | null;
  readonly emailVerified: boolean;
  readonly phoneE164: string | null;
  readonly phoneVerified: boolean;
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
    const existingByPrincipal = await this.repository.customer.findByIamPrincipalIdIncludingDeleted(
      params.iamPrincipalId,
    );
    if (existingByPrincipal) {
      return this.synchronizeExisting(existingByPrincipal, params);
    }

    const existingByEmail = params.email
      ? await this.repository.customer.findByEmail(params.email)
      : null;
    if (existingByEmail) {
      return this.claimExistingEmail(existingByEmail, params);
    }

    const existingByPhone =
      params.phoneE164 && params.phoneVerified
        ? await this.repository.customer.findByPhoneE164(params.phoneE164)
        : null;
    if (existingByPhone) {
      return this.claimExistingPhone(existingByPhone, params);
    }

    const created = await this.repository.customer.createIfAbsent({
      iamPrincipalId: params.iamPrincipalId,
      iamPrincipalStatus: params.iamStatus,
      iamLifecycleDisabled: params.iamStatus === "blocked",
      lifecycleStatus: params.iamStatus === "blocked" ? "DISABLED" : "ACTIVE",
      accountStatus: "REGISTERED",
      email: params.email,
      emailVerified: params.emailVerified,
      phoneE164: params.phoneE164,
      phoneVerified: params.phoneVerified,
      firstName: params.firstName,
      lastName: params.lastName,
      source: "iam_application_signup",
    });
    if (created) {
      await this.invalidateDynamicSegments(created.id, ["customer.any"], "iamCustomerCreated");
      return {
        customerId: created.id,
        created: true,
        updated: false,
      };
    }

    const racedByPrincipal = await this.repository.customer.findByIamPrincipalIdIncludingDeleted(
      params.iamPrincipalId,
    );
    if (racedByPrincipal) {
      return this.synchronizeExisting(racedByPrincipal, params);
    }
    const racedByEmail = params.email
      ? await this.repository.customer.findByEmail(params.email)
      : null;
    if (racedByEmail) {
      return this.claimExistingEmail(racedByEmail, params);
    }
    const racedByPhone =
      params.phoneE164 && params.phoneVerified
        ? await this.repository.customer.findByPhoneE164(params.phoneE164)
        : null;
    if (racedByPhone) {
      return this.claimExistingPhone(racedByPhone, params);
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
    if (!params.email) {
      throw new CustomerProvisioningError(
        "Customer email claim requires an email",
        "CUSTOMER_EMAIL_REQUIRED",
        false,
      );
    }
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

    const claimed = await this.repository.customer.claimIamPrincipal(customer.id, {
      iamPrincipalId: params.iamPrincipalId,
      iamStatus: params.iamStatus,
      email: params.email,
      emailVerified: params.emailVerified,
      iamLifecycleDisabled: params.iamStatus === "blocked" && customer.lifecycleStatus === "ACTIVE",
    });
    if (claimed) {
      await this.invalidateDynamicSegments(
        claimed.id,
        ["profile", "contact", "status"],
        "iamCustomerClaimed",
      );
      return {
        customerId: claimed.id,
        created: false,
        updated: true,
      };
    }

    const raced = await this.repository.customer.findByIamPrincipalIdIncludingDeleted(
      params.iamPrincipalId,
    );
    if (raced) return this.synchronizeExisting(raced, params);

    throw new CustomerProvisioningError(
      "Customer identity claim conflicted with another write",
      "CUSTOMER_IDENTITY_CLAIM_CONFLICT",
      true,
    );
  }

  private async claimExistingPhone(
    customer: Customer,
    params: CustomerProvisionFromIamParams,
  ): Promise<CustomerProvisionFromIamResult> {
    if (!params.phoneE164) {
      throw new CustomerProvisioningError(
        "Customer phone claim requires a phone number",
        "CUSTOMER_PHONE_REQUIRED",
        false,
      );
    }
    if (customer.iamPrincipalId === params.iamPrincipalId) {
      return this.synchronizeExisting(customer, params);
    }
    if (customer.iamPrincipalId) {
      throw new CustomerProvisioningError(
        "Customer phone is already linked to another IAM principal",
        "CUSTOMER_PHONE_PRINCIPAL_CONFLICT",
        false,
      );
    }
    if (customer.lifecycleStatus !== "ACTIVE") {
      throw new CustomerProvisioningError(
        "Customer phone belongs to an inactive customer",
        "CUSTOMER_PHONE_TARGET_INACTIVE",
        false,
      );
    }
    if (!params.phoneVerified) {
      throw new CustomerProvisioningError(
        "Verified phone is required to claim an existing customer",
        "CUSTOMER_PHONE_CLAIM_REQUIRES_VERIFICATION",
        false,
      );
    }

    const claimed = await this.repository.customer.claimIamPrincipal(customer.id, {
      iamPrincipalId: params.iamPrincipalId,
      iamStatus: params.iamStatus,
      phoneE164: params.phoneE164,
      phoneVerified: params.phoneVerified,
      iamLifecycleDisabled: params.iamStatus === "blocked" && customer.lifecycleStatus === "ACTIVE",
    });
    if (claimed) {
      await this.invalidateDynamicSegments(
        claimed.id,
        ["profile", "contact", "status"],
        "iamCustomerClaimed",
      );
      return {
        customerId: claimed.id,
        created: false,
        updated: true,
      };
    }

    const raced = await this.repository.customer.findByIamPrincipalIdIncludingDeleted(
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
    if (["MERGED", "REDACTED"].includes(customer.lifecycleStatus)) {
      return {
        customerId: customer.id,
        created: false,
        updated: false,
      };
    }
    if (
      params.email !== null &&
      customer.normalizedEmail !== normalizeEmail(params.email) &&
      !params.emailVerified
    ) {
      throw new CustomerProvisioningError(
        "Verified email is required to change the customer identity email",
        "CUSTOMER_EMAIL_CHANGE_REQUIRES_VERIFICATION",
        false,
      );
    }
    if (params.email !== null && customer.normalizedEmail !== normalizeEmail(params.email)) {
      const conflictingCustomer = await this.repository.customer.findByEmail(params.email);
      if (conflictingCustomer && conflictingCustomer.id !== customer.id) {
        throw new CustomerProvisioningError(
          "Customer email is already used by another customer",
          "CUSTOMER_EMAIL_CONFLICT",
          false,
        );
      }
    }
    if (
      params.phoneE164 !== null &&
      customer.phoneE164 !== params.phoneE164 &&
      !params.phoneVerified
    ) {
      throw new CustomerProvisioningError(
        "Verified phone is required to change the customer identity phone",
        "CUSTOMER_PHONE_CHANGE_REQUIRES_VERIFICATION",
        false,
      );
    }
    if (params.phoneE164 !== null && customer.phoneE164 !== params.phoneE164) {
      const conflictingCustomer = await this.repository.customer.findByPhoneE164(params.phoneE164);
      if (conflictingCustomer && conflictingCustomer.id !== customer.id) {
        throw new CustomerProvisioningError(
          "Customer phone is already used by another customer",
          "CUSTOMER_PHONE_CONFLICT",
          false,
        );
      }
    }

    const patch = {
      ...(customer.iamPrincipalStatus !== params.iamStatus
        ? { iamPrincipalStatus: params.iamStatus }
        : {}),
      ...(params.iamStatus === "blocked" && customer.lifecycleStatus === "ACTIVE"
        ? {
            lifecycleStatus: "DISABLED" as const,
            iamLifecycleDisabled: true,
          }
        : {}),
      ...(params.iamStatus === "active" &&
      customer.iamLifecycleDisabled &&
      customer.lifecycleStatus === "DISABLED"
        ? {
            lifecycleStatus: "ACTIVE" as const,
            iamLifecycleDisabled: false,
          }
        : {}),
      ...(customer.accountStatus !== "REGISTERED" ? { accountStatus: "REGISTERED" as const } : {}),
      ...(params.email !== null && customer.normalizedEmail !== normalizeEmail(params.email)
        ? { email: params.email }
        : {}),
      ...(params.email !== null && customer.emailVerified !== params.emailVerified
        ? { emailVerified: params.emailVerified }
        : {}),
      ...(params.phoneE164 !== null && customer.phoneE164 !== params.phoneE164
        ? { phoneE164: params.phoneE164 }
        : {}),
      ...(params.phoneE164 !== null && customer.phoneVerified !== params.phoneVerified
        ? { phoneVerified: params.phoneVerified }
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
    await this.invalidateDynamicSegments(
      updated.id,
      ["profile", "contact", "status"],
      "iamCustomerSynchronized",
    );
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
