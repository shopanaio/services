import { BaseScript } from "../../kernel/BaseScript.js";
import type { LexoRankMoveFailureCode } from "../../repositories/LexoRankRepository.js";
import type { FacetMoveParams, FacetResult } from "./dto/index.js";

export class FacetMoveScript extends BaseScript<FacetMoveParams, FacetResult> {
  protected async execute(params: FacetMoveParams): Promise<FacetResult> {
    const result = await this.repository.facet.moveFacetRank(
      params.id,
      params.afterFacetId,
      params.beforeFacetId,
    );

    if (!result.ok) {
      return this.moveError(result.code);
    }

    return { facet: result.item, userErrors: [] };
  }

  private moveError(code: LexoRankMoveFailureCode): FacetResult {
    switch (code) {
      case "INVALID_AFTER_BEFORE":
        return {
          facet: undefined,
          userErrors: [
            {
              message: "afterFacetId and beforeFacetId cannot be the same",
              field: ["afterFacetId", "beforeFacetId"],
              code: "INVALID_INPUT",
            },
          ],
        };
      case "INVALID_AFTER_SELF":
        return {
          facet: undefined,
          userErrors: [
            {
              message: "Cannot move facet after itself",
              field: ["afterFacetId"],
              code: "INVALID_INPUT",
            },
          ],
        };
      case "INVALID_BEFORE_SELF":
        return {
          facet: undefined,
          userErrors: [
            {
              message: "Cannot move facet before itself",
              field: ["beforeFacetId"],
              code: "INVALID_INPUT",
            },
          ],
        };
      case "ITEM_NOT_FOUND":
        return {
          facet: undefined,
          userErrors: [
            { message: "Facet not found", field: ["id"], code: "NOT_FOUND" },
          ],
        };
      case "AFTER_ITEM_NOT_FOUND":
        return {
          facet: undefined,
          userErrors: [
            {
              message: "afterFacetId is not a facet",
              field: ["afterFacetId"],
              code: "NOT_FOUND",
            },
          ],
        };
      case "BEFORE_ITEM_NOT_FOUND":
        return {
          facet: undefined,
          userErrors: [
            {
              message: "beforeFacetId is not a facet",
              field: ["beforeFacetId"],
              code: "NOT_FOUND",
            },
          ],
        };
      case "RANK_SPACE_EXHAUSTED":
        return {
          facet: undefined,
          userErrors: [
            { message: "Unable to move facet", code: "RANK_SPACE_EXHAUSTED" },
          ],
        };
    }
  }

  protected handleError(_error: unknown): FacetResult {
    return {
      facet: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
