import type { UserError } from "../../../kernel/BaseScript.js";
import type { Repository } from "../../../repositories/Repository.js";
import type { FeatureSyncParams } from "../dto/index.js";
import {
  FeatureSyncInputSchema,
  type ValidatedSyncInput,
} from "./schema.js";
import { validateSemantic } from "./semantic.js";
import { loadDbContext, validateDatabase } from "./database.js";

export interface FeatureSyncValidationResult {
  data?: ValidatedSyncInput;
  userErrors: UserError[];
}

export async function validateFeatureSyncParams(
  repository: Pick<Repository, "feature" | "product">,
  params: FeatureSyncParams,
): Promise<FeatureSyncValidationResult> {
  const parseResult = FeatureSyncInputSchema.safeParse(params);
  if (!parseResult.success) {
    return {
      userErrors: parseResult.error.issues.map((issue) => ({
        message: issue.message,
        field: issue.path.map(String),
        code: "VALIDATION_ERROR",
      })),
    };
  }

  const { productId, features } = parseResult.data;
  if (!(await repository.product.exists(productId))) {
    return {
      userErrors: [
        { message: "Product not found", field: ["productId"], code: "NOT_FOUND" },
      ],
    };
  }

  const semanticErrors = validateSemantic(features);
  if (semanticErrors.length > 0) {
    return { userErrors: semanticErrors };
  }

  const dbContext = await loadDbContext(repository.feature, productId, features);
  const databaseErrors = validateDatabase(features, dbContext);
  if (databaseErrors.length > 0) {
    return { userErrors: databaseErrors };
  }

  return { data: parseResult.data, userErrors: [] };
}
