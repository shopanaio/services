import { BaseScript, Transactional } from "../../kernel/BaseScript.js";

export type CustomerIamLifecycleParams =
  | Readonly<{
      operation: "STATUS_CHANGED";
      iamPrincipalId: string;
      status: "active" | "blocked";
    }>
  | Readonly<{
      operation: "DELETED";
      iamPrincipalId: string;
    }>;

export interface CustomerIamLifecycleResult {
  readonly customerId: string | null;
  readonly updated: boolean;
}

/** Applies IAM-owned account lifecycle without turning IAM blocks into merchant risk blocks. */
export class CustomerIamLifecycleScript extends BaseScript<
  CustomerIamLifecycleParams,
  CustomerIamLifecycleResult
> {
  @Transactional()
  protected async execute(
    params: CustomerIamLifecycleParams,
  ): Promise<CustomerIamLifecycleResult> {
    const customer =
      await this.repository.customer.findByIamPrincipalIdIncludingDeleted(
        params.iamPrincipalId,
      );
    if (!customer || customer.deletedAt) {
      return { customerId: customer?.id ?? null, updated: false };
    }

    if (params.operation === "DELETED") {
      const updated = await this.repository.customer.update(customer.id, {
        iamPrincipalId: null,
        iamPrincipalStatus: null,
        iamLifecycleDisabled: false,
        ...(customer.accountStatus === "REGISTERED"
          ? { accountStatus: "GUEST" as const }
          : {}),
        emailVerified: false,
        ...(customer.iamLifecycleDisabled &&
        customer.lifecycleStatus === "DISABLED"
          ? { lifecycleStatus: "ACTIVE" as const }
          : {}),
      });
      return { customerId: customer.id, updated: Boolean(updated) };
    }

    const patch = {
      ...(customer.iamPrincipalStatus !== params.status
        ? { iamPrincipalStatus: params.status }
        : {}),
      ...(params.status === "blocked" && customer.lifecycleStatus === "ACTIVE"
        ? {
            lifecycleStatus: "DISABLED" as const,
            iamLifecycleDisabled: true,
          }
        : {}),
      ...(params.status === "active" &&
      customer.iamLifecycleDisabled &&
      customer.lifecycleStatus === "DISABLED"
        ? {
            lifecycleStatus: "ACTIVE" as const,
            iamLifecycleDisabled: false,
          }
        : {}),
    };
    if (Object.keys(patch).length === 0) {
      return { customerId: customer.id, updated: false };
    }
    const updated = await this.repository.customer.update(customer.id, patch);
    return { customerId: customer.id, updated: Boolean(updated) };
  }

  protected handleError(error: unknown): CustomerIamLifecycleResult {
    throw error;
  }
}
