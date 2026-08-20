import type { UserError } from "../../kernel/BaseScript.js";
import type { DiscountAggregate } from "../../repositories/DiscountRepository.js";
import type {
  DiscountUpdateCombinationsParams,
  DiscountUpdateCombinationsResult,
} from "./dto/index.js";
import { BaseDiscountUpdateScript } from "./BaseDiscountUpdateScript.js";
import { sectionErrors, sectionSuccess } from "./types.js";

export class DiscountUpdateCombinationsScript extends BaseDiscountUpdateScript<DiscountUpdateCombinationsParams> {
  protected async update(
    aggregate: DiscountAggregate,
    params: DiscountUpdateCombinationsParams,
  ): Promise<DiscountUpdateCombinationsResult> {
    const errors: UserError[] = [];
    const seen = new Set<string>();
    for (const [index, item] of params.combinations.entries()) {
      if (seen.has(item)) {
        errors.push({
          message: "A discount class may only be supplied once",
          code: "DUPLICATE_DISCOUNT_CLASS",
          field: [String(index)],
        });
      }
      seen.add(item);
    }
    if (errors.length > 0) return sectionErrors(errors);
    await this.repository.discount.replaceCombinations(aggregate.discount.id, params.combinations);
    return sectionSuccess();
  }
}
