import { BaseScript } from "../../kernel/BaseScript.js";
import type { OptionDeleteParams, OptionDeleteResult } from "./dto/index.js";
import {
  buildOptionSourceChange,
  buildOptionValueChange,
  uniqueFacetReferenceChanges,
} from "../shared/facetReferenceRefs.js";

export class OptionDeleteScript extends BaseScript<OptionDeleteParams, OptionDeleteResult> {
  protected async execute(params: OptionDeleteParams): Promise<OptionDeleteResult> {
    const { id } = params;

    // 1. Check if option exists
    const existingOption = await this.repository.option.findById(id);
    if (!existingOption) {
      return {
        deletedOptionId: undefined,
        userErrors: [{ message: "Option not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }
    const existingValues = await this.repository.option.findValuesByOptionId(id);

    // 2. Delete option (CASCADE will delete values, swatches, variant links, translations)
    const deleted = await this.repository.option.delete(id);
    if (!deleted) {
      return {
        deletedOptionId: undefined,
        userErrors: [{ message: "Failed to delete option", code: "DELETE_FAILED" }],
      };
    }

    this.logger.info({ optionId: id }, "Option deleted");

    return {
      deletedOptionId: id,
      productId: existingOption.productId,
      facetReferenceRefs: uniqueFacetReferenceChanges([
        buildOptionSourceChange({
          before: existingOption,
          reason: "sourceDeleted",
        }),
        ...existingValues.map((value) =>
          buildOptionValueChange({
            before: { option: existingOption, value },
            reason: "sourceValueDeleted",
          })
        ),
      ]),
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): OptionDeleteResult {
    return {
      deletedOptionId: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
