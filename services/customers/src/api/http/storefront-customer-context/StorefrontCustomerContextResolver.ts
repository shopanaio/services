import type { IAM } from "@shopana/broker-types";
import type { ContextCustomer } from "@shopana/shared-context";
import { hashContent } from "@shopana/shared-kernel";
import type { Kernel } from "../../../kernel/Kernel.js";
import type { Customer } from "../../../repositories/models/index.js";
import { CustomerProvisioningError } from "../../../scripts/customer/CustomerProvisionFromIamScript.js";
import type { CustomerProvisionFromIamWorkflowInput } from "../../../workflows/CustomerProvisionFromIamWorkflow.js";

export interface StorefrontCustomerContextResolveInput {
  readonly accessToken: string;
  readonly storeId: string;
  readonly organizationId: string;
  readonly requestId: string;
}

export interface ResolvedStorefrontCustomerContext {
  readonly customer: ContextCustomer;
  readonly cacheUntil: string;
}

export class StorefrontCustomerContextResolver {
  constructor(private readonly kernel: Kernel) {}

  async resolve(
    input: StorefrontCustomerContextResolveInput,
  ): Promise<ResolvedStorefrontCustomerContext | null> {
    const configuration = await this.kernel.repository.storefrontAuth.findByStoreId(input.storeId);
    if (!configuration || configuration.organizationId !== input.organizationId) {
      return null;
    }

    const validation = await this.kernel
      .getServices()
      .broker.call<
        IAM.ValidateServiceLinkedApplicationTokenResult,
        IAM.ValidateServiceLinkedApplicationTokenParams
      >("iam.validateServiceLinkedApplicationToken", {
        applicationId: configuration.applicationId,
        organizationId: configuration.organizationId,
        linkedOwner: {
          linkedOwnerType: "store",
          linkedOwnerId: input.storeId,
        },
        token: input.accessToken,
      });
    if (!validation.active) return null;

    let customer = await this.kernel.repository.customer.findByStoreAndIamPrincipalId(
      input.storeId,
      validation.userId,
    );
    if (!customer) {
      customer = await this.provisionFromValidatedIdentity({
        input,
        configuration,
        applicationUserId: validation.userId,
      });
    }
    if (!customer) return null;

    return Object.freeze({
      customer: Object.freeze({
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phoneE164,
        language: customer.preferredLocale,
        isVerified: customer.emailVerified,
        isBlocked: customer.lifecycleStatus !== "ACTIVE" || customer.accountStatus !== "REGISTERED",
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
      }),
      cacheUntil: validation.cacheUntil,
    });
  }

  private async provisionFromValidatedIdentity(params: {
    input: StorefrontCustomerContextResolveInput;
    configuration: {
      applicationId: string;
      organizationId: string;
      storeId: string;
    };
    applicationUserId: string;
  }): Promise<Customer | null> {
    const identity = await this.kernel
      .getServices()
      .broker.call<
        IAM.GetServiceLinkedApplicationUserResult,
        IAM.GetServiceLinkedApplicationUserParams
      >("iam.getServiceLinkedApplicationUser", {
        applicationId: params.configuration.applicationId,
        organizationId: params.configuration.organizationId,
        linkedOwner: {
          linkedOwnerType: "store",
          linkedOwnerId: params.input.storeId,
        },
        userId: params.applicationUserId,
      });
    if (!identity.found || identity.user.status !== "active") return null;

    const workflowInput: CustomerProvisionFromIamWorkflowInput = {
      params: {
        iamPrincipalId: identity.user.id,
        iamStatus: identity.user.status,
        email: identity.user.email,
        emailVerified: identity.user.emailVerified,
        phoneE164: identity.user.phoneNumber,
        phoneVerified: identity.user.phoneNumberVerified,
        firstName: identity.user.firstName,
        lastName: identity.user.lastName,
      },
      context: {
        storeId: params.input.storeId,
        organizationId: params.input.organizationId,
        requestId: params.input.requestId,
      },
    };
    try {
      await this.kernel
        .getServices()
        .broker.runWorkflow("customers.customerProvisionFromIam", workflowInput, {
          source: "content",
          resourceId: `${params.input.storeId}:${identity.user.id}`,
          operation: "customerProvisionFromIamReadRepair",
          contentHash: hashContent(workflowInput.params),
        });
    } catch (error) {
      if (isNonRetryableProvisioningConflict(error)) return null;
      throw error;
    }

    return this.kernel.repository.customer.findByStoreAndIamPrincipalId(
      params.input.storeId,
      identity.user.id,
    );
  }
}

function isNonRetryableProvisioningConflict(error: unknown): boolean {
  if (error instanceof CustomerProvisioningError) return !error.retryable;
  return Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string" &&
    error.code.startsWith("CUSTOMER_") &&
    "retryable" in error &&
    error.retryable === false,
  );
}
