import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  Workflow,
  WorkflowStep,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";
import { Kernel } from "../kernel/Kernel.js";
import type {
  OperationWorkflowInput,
  OperationResult,
  BulkEditError,
} from "./dto/BulkEditWorkflowDto.js";
import type { BulkEditItem } from "../repositories/models/index.js";

import { ProductUpdateScript } from "../scripts/product/ProductUpdateScript.js";
import { ProductUpdateStatusScript } from "../scripts/product/ProductUpdateStatusScript.js";
import { VariantUpdatePricingScript } from "../scripts/variant/VariantUpdatePricingScript.js";
import { VariantUpdateDimensionsScript } from "../scripts/variant/VariantUpdateDimensionsScript.js";
import { VariantUpdateInventoryScript } from "../scripts/variant/VariantUpdateInventoryScript.js";

@Injectable()
export class BulkEditOperationWorkflow extends BrokerWorkflows {
  constructor(@InjectBroker("inventory") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  @Workflow("bulkEditOperation")
  async run(input: OperationWorkflowInput): Promise<OperationResult> {
    const { itemId } = input;

    const item = await this.stepLoadItem(itemId);
    if (!item) {
      return { applied: false, errors: [{ message: "Item not found", code: "NOT_FOUND" }] };
    }

    const result = await this.stepRunOperation(item);

    return result;
  }

  @WorkflowStep()
  private async stepLoadItem(itemId: string): Promise<BulkEditItem | null> {
    return this.kernel.repository.bulkEditItem.findById(itemId);
  }

  @WorkflowStep()
  private async stepRunOperation(item: BulkEditItem): Promise<OperationResult> {
    const { opType, params } = item;
    const errors: BulkEditError[] = [];

    try {
      switch (opType) {
        case "productUpdate": {
          const result = await this.kernel.runScript(ProductUpdateScript, params as any);
          if (result.userErrors.length > 0) {
            errors.push(...result.userErrors.map(toError));
          }
          break;
        }

        case "productUpdateStatus": {
          const result = await this.kernel.runScript(ProductUpdateStatusScript, params as any);
          if (result.userErrors.length > 0) {
            errors.push(...result.userErrors.map(toError));
          }
          break;
        }

        case "variantUpdatePricing": {
          const result = await this.kernel.runScript(VariantUpdatePricingScript, params as any);
          if (result.userErrors.length > 0) {
            errors.push(...result.userErrors.map(toError));
          }
          break;
        }

        case "variantUpdateDimensions": {
          const result = await this.kernel.runScript(VariantUpdateDimensionsScript, params as any);
          if (result.userErrors.length > 0) {
            errors.push(...result.userErrors.map(toError));
          }
          break;
        }

        case "variantUpdateInventory": {
          const result = await this.kernel.runScript(VariantUpdateInventoryScript, params as any);
          if (result.userErrors.length > 0) {
            errors.push(...result.userErrors.map(toError));
          }
          break;
        }

        default:
          errors.push({ message: `Unknown operation type: ${opType}`, code: "INVALID_OP_TYPE" });
      }
    } catch (error) {
      errors.push({
        message: error instanceof Error ? error.message : "Unknown error",
        code: "SCRIPT_ERROR",
      });
    }

    return { applied: errors.length === 0, errors };
  }
}

function toError(userError: { message: string; code?: string; field?: string[] }): BulkEditError {
  return {
    message: userError.message,
    code: userError.code ?? "UNKNOWN",
    field: userError.field,
  };
}
