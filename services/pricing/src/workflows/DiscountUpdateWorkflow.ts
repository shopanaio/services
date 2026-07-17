import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  InjectBroker,
  ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import { and, eq, sql } from "drizzle-orm";
import { Kernel } from "../kernel/Kernel.js";
import type { UserError } from "../kernel/BaseScript.js";
import type { RunScriptContext } from "../kernel/types.js";
import { discount } from "../repositories/models/index.js";
import { DiscountUpdateChannelsScript } from "../scripts/discount/DiscountUpdateChannelsScript.js";
import { DiscountUpdateCodesScript } from "../scripts/discount/DiscountUpdateCodesScript.js";
import { DiscountUpdateCombinationsScript } from "../scripts/discount/DiscountUpdateCombinationsScript.js";
import { DiscountUpdateDefinitionScript } from "../scripts/discount/DiscountUpdateDefinitionScript.js";
import { DiscountUpdateEligibilityScript } from "../scripts/discount/DiscountUpdateEligibilityScript.js";
import { DiscountUpdateLifecycleScript } from "../scripts/discount/DiscountUpdateLifecycleScript.js";
import { DiscountUpdateMetadataScript } from "../scripts/discount/DiscountUpdateMetadataScript.js";
import { DiscountUpdateMinimumRequirementScript } from "../scripts/discount/DiscountUpdateMinimumRequirementScript.js";
import { DiscountUpdateRuleScript } from "../scripts/discount/DiscountUpdateRuleScript.js";
import { DiscountUpdateTagsScript } from "../scripts/discount/DiscountUpdateTagsScript.js";
import { DiscountUpdateTargetsScript } from "../scripts/discount/DiscountUpdateTargetsScript.js";
import type {
  DiscountUpdateChannelsParams,
  DiscountUpdateCodesParams,
  DiscountUpdateCombinationsParams,
  DiscountUpdateDefinitionParams,
  DiscountUpdateEligibilityParams,
  DiscountUpdateLifecycleParams,
  DiscountUpdateMetadataParams,
  DiscountUpdateMinimumRequirementParams,
  DiscountUpdateRuleParams,
  DiscountUpdateTagsParams,
  DiscountUpdateTargetsParams,
} from "../scripts/discount/dto/index.js";
import type { DiscountSectionResult } from "../scripts/discount/types.js";
import type {
  DiscountUpdateOperation,
  DiscountUpdateOperationResult,
  DiscountUpdateWorkflowInput,
  DiscountUpdateWorkflowResult,
  PricingMutationWorkflowContext,
} from "./dto/index.js";

@Injectable()
export class DiscountUpdateWorkflow extends BrokerWorkflows {
  constructor(@InjectBroker("pricing") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  private toScriptContext(
    context: PricingMutationWorkflowContext,
  ): RunScriptContext {
    return {
      storeId: context.storeId,
      organizationId: context.organizationId,
      locale: context.locale,
      defaultLocale: context.defaultLocale,
      defaultCurrency: context.defaultCurrency,
      locales: context.locales,
      currencies: context.currencies,
      userId: context.userId,
      requestId: context.requestId,
    };
  }

  @Workflow("discountUpdate")
  async run(
    input: DiscountUpdateWorkflowInput,
  ): Promise<DiscountUpdateWorkflowResult> {
    const acquired = await this.stepAcquireRevision(
      input.discountId,
      input.expectedRevision,
      input.context.storeId,
    );
    if ("error" in acquired) {
      return {
        discount: null,
        operationResults: [],
        userErrors: [acquired.error],
      };
    }

    const results: DiscountUpdateOperationResult[] = [];
    const scriptContext = this.toScriptContext(input.context);
    for (const operation of input.operations) {
      let result: DiscountUpdateOperationResult;
      if (operation.type === "discountDefinitionUpdate") {
        result = await this.stepDiscountDefinitionUpdate(
          {
            discountId: input.discountId,
            definition: operation.params,
          },
          scriptContext,
        );
      } else if (operation.type === "discountRuleUpdate") {
        result = await this.stepDiscountRuleUpdate(
          { discountId: input.discountId, rule: operation.params },
          scriptContext,
        );
      } else if (operation.type === "discountMinimumRequirementUpdate") {
        result = await this.stepDiscountMinimumRequirementUpdate(
          {
            discountId: input.discountId,
            minimumRequirement: operation.params,
          },
          scriptContext,
        );
      } else if (operation.type === "discountTargetsUpdate") {
        result = await this.stepDiscountTargetsUpdate(
          {
            discountId: input.discountId,
            targetSelections: operation.params.items,
          },
          scriptContext,
        );
      } else if (operation.type === "discountEligibilityUpdate") {
        result = await this.stepDiscountEligibilityUpdate(
          { discountId: input.discountId, eligibility: operation.params },
          scriptContext,
        );
      } else if (operation.type === "discountCodesUpdate") {
        result = await this.stepDiscountCodesUpdate(
          { discountId: input.discountId, codes: operation.params },
          scriptContext,
        );
      } else if (operation.type === "discountTagsUpdate") {
        result = await this.stepDiscountTagsUpdate(
          { discountId: input.discountId, tags: operation.params.items },
          scriptContext,
        );
      } else if (operation.type === "discountChannelsUpdate") {
        result = await this.stepDiscountChannelsUpdate(
          { discountId: input.discountId, channels: operation.params.items },
          scriptContext,
        );
      } else if (operation.type === "discountCombinationsUpdate") {
        result = await this.stepDiscountCombinationsUpdate(
          {
            discountId: input.discountId,
            combinations: operation.params.items,
          },
          scriptContext,
        );
      } else if (operation.type === "discountLifecycleUpdate") {
        result = await this.stepDiscountLifecycleUpdate(
          { discountId: input.discountId, lifecycle: operation.params },
          scriptContext,
        );
      } else {
        result = await this.stepDiscountMetadataUpdate(
          {
            discountId: input.discountId,
            metadata: operation.params.metadata,
          },
          scriptContext,
        );
      }
      results.push(prefixOperationResultErrors(result, operation));
    }

    return {
      discount: { id: input.discountId, revision: acquired.revision },
      operationResults: results,
      userErrors: results.flatMap((result) => result.errors),
    };
  }

  @WorkflowStep()
  private async stepAcquireRevision(
    discountId: string,
    expectedRevision: number,
    storeId: string,
  ): Promise<{ revision: number } | { error: UserError }> {
    const rows = await this.kernel.db
      .update(discount)
      .set({
        revision: sql`${discount.revision} + 1`,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(discount.storeId, storeId),
          eq(discount.id, discountId),
          eq(discount.revision, expectedRevision),
        ),
      )
      .returning({ revision: discount.revision });

    if (rows[0]) return { revision: rows[0].revision };

    const [existing] = await this.kernel.db
      .select({ id: discount.id })
      .from(discount)
      .where(and(eq(discount.storeId, storeId), eq(discount.id, discountId)))
      .limit(1);

    return {
      error: existing
        ? {
            message: "Discount was modified by another user",
            code: "REVISION_CONFLICT",
            field: ["expectedRevision"],
          }
        : { message: "Discount not found", code: "NOT_FOUND" },
    };
  }

  @WorkflowStep()
  private async stepDiscountDefinitionUpdate(
    params: DiscountUpdateDefinitionParams,
    context: RunScriptContext,
  ): Promise<DiscountUpdateOperationResult> {
    const result = await this.kernel.runScript(
      DiscountUpdateDefinitionScript,
      params,
      context,
    );
    return operationResult("discountDefinitionUpdate", result);
  }

  @WorkflowStep()
  private async stepDiscountRuleUpdate(
    params: DiscountUpdateRuleParams,
    context: RunScriptContext,
  ): Promise<DiscountUpdateOperationResult> {
    const result = await this.kernel.runScript(
      DiscountUpdateRuleScript,
      params,
      context,
    );
    return operationResult("discountRuleUpdate", result);
  }

  @WorkflowStep()
  private async stepDiscountMinimumRequirementUpdate(
    params: DiscountUpdateMinimumRequirementParams,
    context: RunScriptContext,
  ): Promise<DiscountUpdateOperationResult> {
    const result = await this.kernel.runScript(
      DiscountUpdateMinimumRequirementScript,
      params,
      context,
    );
    return operationResult("discountMinimumRequirementUpdate", result);
  }

  @WorkflowStep()
  private async stepDiscountTargetsUpdate(
    params: DiscountUpdateTargetsParams,
    context: RunScriptContext,
  ): Promise<DiscountUpdateOperationResult> {
    const result = await this.kernel.runScript(
      DiscountUpdateTargetsScript,
      params,
      context,
    );
    return operationResult("discountTargetsUpdate", result);
  }

  @WorkflowStep()
  private async stepDiscountEligibilityUpdate(
    params: DiscountUpdateEligibilityParams,
    context: RunScriptContext,
  ): Promise<DiscountUpdateOperationResult> {
    const result = await this.kernel.runScript(
      DiscountUpdateEligibilityScript,
      params,
      context,
    );
    return operationResult("discountEligibilityUpdate", result);
  }

  @WorkflowStep()
  private async stepDiscountCodesUpdate(
    params: DiscountUpdateCodesParams,
    context: RunScriptContext,
  ): Promise<DiscountUpdateOperationResult> {
    const result = await this.kernel.runScript(
      DiscountUpdateCodesScript,
      params,
      context,
    );
    return operationResult("discountCodesUpdate", result);
  }

  @WorkflowStep()
  private async stepDiscountTagsUpdate(
    params: DiscountUpdateTagsParams,
    context: RunScriptContext,
  ): Promise<DiscountUpdateOperationResult> {
    const result = await this.kernel.runScript(
      DiscountUpdateTagsScript,
      params,
      context,
    );
    return operationResult("discountTagsUpdate", result);
  }

  @WorkflowStep()
  private async stepDiscountChannelsUpdate(
    params: DiscountUpdateChannelsParams,
    context: RunScriptContext,
  ): Promise<DiscountUpdateOperationResult> {
    const result = await this.kernel.runScript(
      DiscountUpdateChannelsScript,
      params,
      context,
    );
    return operationResult("discountChannelsUpdate", result);
  }

  @WorkflowStep()
  private async stepDiscountCombinationsUpdate(
    params: DiscountUpdateCombinationsParams,
    context: RunScriptContext,
  ): Promise<DiscountUpdateOperationResult> {
    const result = await this.kernel.runScript(
      DiscountUpdateCombinationsScript,
      params,
      context,
    );
    return operationResult("discountCombinationsUpdate", result);
  }

  @WorkflowStep()
  private async stepDiscountLifecycleUpdate(
    params: DiscountUpdateLifecycleParams,
    context: RunScriptContext,
  ): Promise<DiscountUpdateOperationResult> {
    const result = await this.kernel.runScript(
      DiscountUpdateLifecycleScript,
      params,
      context,
    );
    return operationResult("discountLifecycleUpdate", result);
  }

  @WorkflowStep()
  private async stepDiscountMetadataUpdate(
    params: DiscountUpdateMetadataParams,
    context: RunScriptContext,
  ): Promise<DiscountUpdateOperationResult> {
    const result = await this.kernel.runScript(
      DiscountUpdateMetadataScript,
      params,
      context,
    );
    return operationResult("discountMetadataUpdate", result);
  }
}

function operationResult(
  type: DiscountUpdateOperation["type"],
  result: DiscountSectionResult,
): DiscountUpdateOperationResult {
  return {
    type,
    applied: result.userErrors.length === 0,
    errors: result.userErrors,
  };
}

function prefixOperationResultErrors(
  result: DiscountUpdateOperationResult,
  operation: DiscountUpdateOperation,
): DiscountUpdateOperationResult {
  return {
    ...result,
    errors: result.errors.map((error) => ({
      ...error,
      field: error.field
        ? [...operation.meta.fieldPrefix, ...error.field]
        : operation.meta.fieldPrefix,
    })),
  };
}
