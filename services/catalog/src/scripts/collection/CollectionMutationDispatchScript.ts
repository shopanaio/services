import { Transactional } from "../../kernel/BaseScript.js";
import { BaseScript } from "../../kernel/BaseScript.js";
import { RetryableError } from "@shopana/shared-kernel";
import { CollectionAddProductsScript } from "./CollectionAddProductsScript.js";
import { CollectionClearProductsScript } from "./CollectionClearProductsScript.js";
import { CollectionCreateScript } from "./CollectionCreateScript.js";
import { CollectionDeleteScript } from "./CollectionDeleteScript.js";
import { CollectionMoveProductScript } from "./CollectionMoveProductScript.js";
import { CollectionRebalanceScript } from "./CollectionRebalanceScript.js";
import { CollectionRemoveProductsScript } from "./CollectionRemoveProductsScript.js";
import { CollectionUpdateRulesScript } from "./CollectionUpdateRulesScript.js";
import { CollectionUpdateScript } from "./CollectionUpdateScript.js";
import type {
  CollectionAddProductsParams,
  CollectionClearProductsParams,
  CollectionCreateParams,
  CollectionDeleteParams,
  CollectionDeleteResult,
  CollectionMoveProductParams,
  CollectionRebalanceParams,
  CollectionRemoveProductsParams,
  CollectionResult,
  CollectionUpdateParams,
  CollectionUpdateRulesParams,
} from "./dto/index.js";

export type CollectionMutationOperation =
  | { kind: "create"; params: CollectionCreateParams }
  | { kind: "update"; params: CollectionUpdateParams }
  | { kind: "delete"; params: CollectionDeleteParams }
  | { kind: "addProducts"; params: CollectionAddProductsParams }
  | { kind: "removeProducts"; params: CollectionRemoveProductsParams }
  | { kind: "moveProduct"; params: CollectionMoveProductParams }
  | { kind: "rebalance"; params: CollectionRebalanceParams }
  | { kind: "clearProducts"; params: CollectionClearProductsParams }
  | { kind: "updateRules"; params: CollectionUpdateRulesParams };

export interface CollectionMutationDispatchInput {
  workflowId: string;
  requestHash: string;
  operation: CollectionMutationOperation;
}

export type CollectionMutationDispatchResult = CollectionResult | CollectionDeleteResult;

export class CollectionMutationDispatchScript extends BaseScript<
  CollectionMutationDispatchInput,
  CollectionMutationDispatchResult
> {
  @Transactional()
  protected async execute(
    input: CollectionMutationDispatchInput,
  ): Promise<CollectionMutationDispatchResult> {
    const receipt = await this.repository.collectionSync.findMutationReceipt(input.workflowId);
    if (receipt) {
      if (receipt.requestHash !== input.requestHash) {
        return conflictResult(input.operation.kind);
      }
      return receipt.resultJson as CollectionMutationDispatchResult;
    }

    const result = await this.runOperation(input.operation);
    if (result.userErrors.some((error) => error.code === "INTERNAL_ERROR")) {
      throw new RetryableError("Collection mutation failed transiently");
    }
    await this.repository.collectionSync.saveMutationReceipt({
      workflowId: input.workflowId,
      requestHash: input.requestHash,
      mutationKind: input.operation.kind,
      result,
    });
    return result;
  }

  protected handleError(error: unknown): never {
    throw error;
  }

  private runOperation(
    operation: CollectionMutationOperation,
  ): Promise<CollectionMutationDispatchResult> {
    switch (operation.kind) {
      case "create":
        return this.executeScript(CollectionCreateScript, operation.params);
      case "update":
        return this.executeScript(CollectionUpdateScript, operation.params);
      case "delete":
        return this.executeScript(CollectionDeleteScript, operation.params);
      case "addProducts":
        return this.executeScript(CollectionAddProductsScript, operation.params);
      case "removeProducts":
        return this.executeScript(CollectionRemoveProductsScript, operation.params);
      case "moveProduct":
        return this.executeScript(CollectionMoveProductScript, operation.params);
      case "rebalance":
        return this.executeScript(CollectionRebalanceScript, operation.params);
      case "clearProducts":
        return this.executeScript(CollectionClearProductsScript, operation.params);
      case "updateRules":
        return this.executeScript(CollectionUpdateRulesScript, operation.params);
    }
  }
}

function conflictResult(
  kind: CollectionMutationOperation["kind"],
): CollectionMutationDispatchResult {
  const userErrors = [
    {
      message: "Client mutation id was reused with different input",
      code: "IDEMPOTENCY_KEY_REUSED",
    },
  ];
  return kind === "delete"
    ? { deletedCollectionId: undefined, userErrors }
    : { collection: undefined, userErrors };
}
