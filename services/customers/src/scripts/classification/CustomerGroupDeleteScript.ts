import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { UserError } from "../../kernel/BaseScript.js";

export interface CustomerGroupDeleteParams {
  id: string;
}

export interface CustomerGroupDeleteResult {
  deletedGroupId?: string;
  userErrors: UserError[];
}

export class CustomerGroupDeleteScript extends BaseScript<
  CustomerGroupDeleteParams,
  CustomerGroupDeleteResult
> {
  @Transactional()
  protected async execute(params: CustomerGroupDeleteParams): Promise<CustomerGroupDeleteResult> {
    const group = await this.repository.group.findById(params.id);
    if (!group) {
      return notFound();
    }
    const customerIds = await this.repository.group.customerIdsByGroupId(params.id);
    if (group.isDefault || customerIds.length > 0) {
      return {
        deletedGroupId: undefined,
        userErrors: [
          {
            message: group.isDefault
              ? "The default customer group cannot be deleted"
              : "A customer group with active memberships cannot be deleted",
            code: "DEPENDENCY_EXISTS",
            field: ["id"],
          },
        ],
      };
    }

    const deleted = await this.repository.group.softDelete(params.id);
    if (!deleted) {
      return notFound();
    }
    for (const customerId of customerIds) {
      await this.invalidateDynamicSegments(customerId, ["group"], `groupDeleted:${params.id}`);
    }

    this.logger.info({ groupId: params.id }, "Customer group deleted");
    return { deletedGroupId: params.id, userErrors: [] };
  }

  protected handleError(_error: unknown): CustomerGroupDeleteResult {
    return {
      deletedGroupId: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

function notFound(): CustomerGroupDeleteResult {
  return {
    deletedGroupId: undefined,
    userErrors: [{ message: "Customer group not found", field: ["id"], code: "NOT_FOUND" }],
  };
}
