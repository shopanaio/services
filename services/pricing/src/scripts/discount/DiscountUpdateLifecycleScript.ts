import type { DiscountAggregate } from "../../repositories/DiscountRepository.js";
import type {
  DiscountUpdateLifecycleParams,
  DiscountUpdateLifecycleResult,
} from "./dto/index.js";
import { BaseDiscountUpdateScript } from "./BaseDiscountUpdateScript.js";
import { sectionErrors, sectionSuccess } from "./types.js";

export class DiscountUpdateLifecycleScript extends BaseDiscountUpdateScript<DiscountUpdateLifecycleParams> {
  protected readonly allowArchived: boolean = true;

  protected async update(
    aggregate: DiscountAggregate,
    params: DiscountUpdateLifecycleParams,
  ): Promise<DiscountUpdateLifecycleResult> {
    const state = params.lifecycle.state;
    if (aggregate.discount.state === "ARCHIVED") {
      if (state === "ARCHIVED") return sectionSuccess(false);
      return sectionErrors([
        {
          message: "Archived discounts cannot be restored",
          code: "INVALID_STATE_TRANSITION",
          field: ["state"],
        },
      ]);
    }
    if (state === aggregate.discount.state) return sectionSuccess(false);
    await this.repository.discount.updateRoot(aggregate.discount.id, {
      state,
      archivedAt: state === "ARCHIVED" ? new Date().toISOString() : null,
    });
    return sectionSuccess();
  }
}
