import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { CustomerGroupsUpdateOperation } from "../../workflows/dto/index.js";
import {
  internalSectionError,
  sectionErrors,
  sectionSuccess,
  type CustomerSectionResult,
} from "./types.js";

export interface CustomerGroupsUpdateParams {
  customerId: string;
  operations: CustomerGroupsUpdateOperation["params"];
}

export class CustomerGroupsUpdateScript extends BaseScript<
  CustomerGroupsUpdateParams,
  CustomerSectionResult
> {
  @Transactional()
  protected async execute(
    params: CustomerGroupsUpdateParams
  ): Promise<CustomerSectionResult> {
    const errors: Array<{ message: string; code: string; field?: string[] }> = [];
    const ids = params.operations.memberships.map((item) => item.groupId);
    const groups = await this.repository.group.getByIds(ids);
    const existingIds = new Set(groups.map((group) => group.id));
    const seen = new Set<string>();
    let primaryCount = 0;

    for (const [index, membership] of params.operations.memberships.entries()) {
      if (!existingIds.has(membership.groupId)) {
        errors.push({
          message: "Customer group not found",
          code: "NOT_FOUND",
          field: ["memberships", String(index), "groupId"],
        });
      }
      if (seen.has(membership.groupId)) {
        errors.push({
          message: "Customer group cannot appear more than once",
          code: "DUPLICATE_ID",
          field: ["memberships", String(index), "groupId"],
        });
      }
      seen.add(membership.groupId);
      if (membership.isPrimary === true) primaryCount += 1;
    }
    if (primaryCount > 1) {
      errors.push({
        message: "Only one customer group can be primary",
        code: "MULTIPLE_PRIMARY_GROUPS",
        field: ["memberships"],
      });
    }
    if (errors.length > 0) return sectionErrors(errors);

    await this.repository.group.replaceManualMembershipsForCustomer(
      params.customerId,
      params.operations.memberships.map((membership) => ({
        groupId: membership.groupId,
        isPrimary: membership.isPrimary ?? false,
        expiresAt: membership.expiresAt ?? null,
        assignedById: this.context.hasUser ? this.currentUser.id : null,
      }))
    );

    await this.invalidateDynamicSegments(params.customerId, ["group"], "group");

    return sectionSuccess();
  }

  protected handleError(_error: unknown): CustomerSectionResult {
    return internalSectionError();
  }
}
