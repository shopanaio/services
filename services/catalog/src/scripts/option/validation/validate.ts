import type { UserError } from "../../../kernel/BaseScript.js";
import type { Repository } from "../../../repositories/Repository.js";
import type { OptionSyncParams } from "../dto/index.js";
import { OptionSyncInputSchema, type ValidatedSyncInput } from "./schema.js";
import { validateSemantic } from "./semantic.js";
import { loadDbContext, validateDatabase } from "./database.js";

export interface OptionSyncValidationResult {
  data?: ValidatedSyncInput;
  userErrors: UserError[];
}

export async function validateOptionSyncParams(
  repository: Pick<Repository, "option" | "optionCategory" | "product">,
  params: OptionSyncParams,
): Promise<OptionSyncValidationResult> {
  const parseResult = OptionSyncInputSchema.safeParse(params);
  if (!parseResult.success) {
    return {
      userErrors: parseResult.error.issues.map((issue) => ({
        message: issue.message,
        field: issue.path.map(String),
        code: "VALIDATION_ERROR",
      })),
    };
  }

  const { productId, options } = parseResult.data;
  if (!(await repository.product.exists(productId))) {
    return {
      userErrors: [{ message: "Product not found", field: ["productId"], code: "NOT_FOUND" }],
    };
  }

  const categoryIds = [...new Set(options.map((option) => option.categoryId))];
  const categories = await repository.optionCategory.getByIds(categoryIds);
  if (categories.length !== categoryIds.length) {
    const existingIds = new Set(categories.map((category) => category.id));
    const optionIndex = options.findIndex((option) => !existingIds.has(option.categoryId));
    return {
      userErrors: [
        {
          message: "Option category not found",
          field: ["options", String(optionIndex), "categoryId"],
          code: "NOT_FOUND",
        },
      ],
    };
  }

  const semanticErrors = validateSemantic(options);
  if (semanticErrors.length > 0) {
    return { userErrors: semanticErrors };
  }

  const dbContext = await loadDbContext(repository.option, productId, options);
  const databaseErrors = validateDatabase(options, dbContext);
  if (databaseErrors.length > 0) {
    return { userErrors: databaseErrors };
  }

  return { data: parseResult.data, userErrors: [] };
}
