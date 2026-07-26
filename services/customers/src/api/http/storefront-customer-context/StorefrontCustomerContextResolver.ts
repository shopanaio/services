import type { IAM } from "@shopana/broker-types";
import type { ContextCustomer } from "@shopana/shared-context";
import type { Kernel } from "../../../kernel/Kernel.js";

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
    const configuration =
      await this.kernel.repository.storefrontAuth.findByStoreId(input.storeId);
    if (
      !configuration ||
      configuration.organizationId !== input.organizationId
    ) {
      return null;
    }

    const validation = await this.kernel.getServices().broker.call<
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

    const customer =
      await this.kernel.repository.customer.findByStoreAndIamPrincipalId(
        input.storeId,
        validation.userId,
      );
    if (
      !customer ||
      customer.lifecycleStatus !== "ACTIVE" ||
      customer.accountStatus !== "REGISTERED"
    ) {
      return null;
    }

    return Object.freeze({
      customer: Object.freeze({
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phoneE164,
        language: customer.preferredLocale,
        isVerified: customer.emailVerified,
        isBlocked: false,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
      }),
      cacheUntil: validation.cacheUntil,
    });
  }
}
