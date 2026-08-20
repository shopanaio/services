import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { UserError } from "../../kernel/BaseScript.js";

export interface CustomerTagDeleteParams {
  id: string;
}

export interface CustomerTagDeleteResult {
  deletedTagId?: string;
  userErrors: UserError[];
}

export class CustomerTagDeleteScript extends BaseScript<
  CustomerTagDeleteParams,
  CustomerTagDeleteResult
> {
  @Transactional()
  protected async execute(params: CustomerTagDeleteParams): Promise<CustomerTagDeleteResult> {
    const tag = await this.repository.tag.findById(params.id);
    if (!tag) {
      return notFound();
    }
    const customerIds = await this.repository.tag.customerIdsByTagId(params.id);
    for (const customerId of customerIds) {
      await this.repository.tag.unassign(customerId, params.id);
    }

    const deleted = await this.repository.tag.softDelete(params.id);
    if (!deleted) {
      return notFound();
    }
    for (const customerId of customerIds) {
      await this.invalidateDynamicSegments(customerId, ["tag"], `tagDeleted:${params.id}`);
    }

    this.logger.info({ tagId: params.id }, "Customer tag deleted");
    return { deletedTagId: params.id, userErrors: [] };
  }

  protected handleError(_error: unknown): CustomerTagDeleteResult {
    return {
      deletedTagId: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

function notFound(): CustomerTagDeleteResult {
  return {
    deletedTagId: undefined,
    userErrors: [{ message: "Customer tag not found", field: ["id"], code: "NOT_FOUND" }],
  };
}
