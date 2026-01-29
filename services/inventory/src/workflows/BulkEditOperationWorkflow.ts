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
import { ProductSetStatusScript } from "../scripts/product/ProductSetStatusScript.js";
import { VariantSetSkuScript } from "../scripts/variant/VariantSetSkuScript.js";
import { VariantSetPricingScript } from "../scripts/variant/VariantSetPricingScript.js";
import { VariantSetCostScript } from "../scripts/variant/VariantSetCostScript.js";
import { VariantSetStockScript } from "../scripts/variant/VariantSetStockScript.js";
import { VariantSetDimensionsScript } from "../scripts/variant/VariantSetDimensionsScript.js";
import { VariantSetWeightScript } from "../scripts/variant/VariantSetWeightScript.js";

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

        case "productSetStatus": {
          const result = await this.kernel.runScript(ProductSetStatusScript, params as any);
          if (result.userErrors.length > 0) {
            errors.push(...result.userErrors.map(toError));
          }
          break;
        }

        case "variantSetSku": {
          const result = await this.kernel.runScript(VariantSetSkuScript, params as any);
          if (result.userErrors.length > 0) {
            errors.push(...result.userErrors.map(toError));
          }
          break;
        }

        case "variantSetPricing": {
          const result = await this.kernel.runScript(VariantSetPricingScript, params as any);
          if (result.userErrors.length > 0) {
            errors.push(...result.userErrors.map(toError));
          }
          break;
        }

        case "variantSetCost": {
          const result = await this.kernel.runScript(VariantSetCostScript, params as any);
          if (result.userErrors.length > 0) {
            errors.push(...result.userErrors.map(toError));
          }
          break;
        }

        case "variantSetStock": {
          const result = await this.kernel.runScript(VariantSetStockScript, params as any);
          if (result.userErrors.length > 0) {
            errors.push(...result.userErrors.map(toError));
          }
          break;
        }

        case "variantSetDimensions": {
          const result = await this.kernel.runScript(VariantSetDimensionsScript, params as any);
          if (result.userErrors.length > 0) {
            errors.push(...result.userErrors.map(toError));
          }
          break;
        }

        case "variantSetWeight": {
          const result = await this.kernel.runScript(VariantSetWeightScript, params as any);
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
