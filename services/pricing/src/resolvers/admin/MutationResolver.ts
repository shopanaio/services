import {
  decodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { ApolloMutation } from "@shopana/type-resolver";
import type {
  PricingMutationDiscountUpdateArgs,
} from "./generated/types.js";
import type {
  DiscountUpdateWorkflowInput,
  DiscountUpdateWorkflowResult,
  PricingMutationWorkflowContext,
} from "../../workflows/dto/index.js";
import { DiscountResolver } from "./DiscountResolver.js";
import {
  mapDiscountUpdateInput,
  mapPreflightDiscountOperationResult,
  toGraphqlDiscountOperationType,
} from "./discountUpdateMapper.js";
import { PricingType } from "./PricingType.js";

@ApolloMutation
export class MutationResolver extends PricingType<Record<string, never>> {
  pricingMutation() {
    return this.resolvers.pricingMutation();
  }
}

export class PricingMutationResolver extends PricingType<Record<string, never>> {
  async discountUpdate(args: PricingMutationDiscountUpdateArgs) {
    const mapped = mapDiscountUpdateInput(args.operations);
    let discountId: string | undefined;
    try {
      discountId = decodeGlobalIdByType(
        args.discountId,
        GlobalIdEntity.Discount,
      );
    } catch {
      const error = {
        message: "Invalid ID format",
        field: ["discountId"],
        code: "INVALID_ID",
      };
      return {
        discount: null,
        operationResults: mapped.entries.map(
          mapPreflightDiscountOperationResult,
        ),
        userErrors: [error, ...mapped.errors],
      };
    }

    if (mapped.errors.length > 0) {
      return {
        discount: null,
        operationResults: mapped.entries.map(
          mapPreflightDiscountOperationResult,
        ),
        userErrors: mapped.errors,
      };
    }

    const workflowInput: DiscountUpdateWorkflowInput = {
      discountId,
      expectedRevision: args.expectedRevision,
      operations: mapped.operations,
      context: this.mutationWorkflowContext(),
    };
    const result = await this.runMutationWorkflow<DiscountUpdateWorkflowResult>(
      "discountUpdate",
      workflowInput,
      discountId,
    );

    this.clearDiscountUpdateLoaders(discountId, workflowInput);
    return {
      discount: result.discount
        ? new DiscountResolver(result.discount.id, this.$ctx)
        : null,
      operationResults: result.operationResults.map((operation) => ({
        type: toGraphqlDiscountOperationType(operation.type),
        applied: operation.applied,
        errors: operation.errors,
      })),
      userErrors: result.userErrors,
    };
  }

  private mutationWorkflowContext(): PricingMutationWorkflowContext {
    return {
      organizationId: this.$ctx.store.organizationId,
      storeId: this.$ctx.store.id,
      userId: this.$ctx.hasUser ? this.$ctx.user.id : undefined,
      locale: this.$ctx.locale ?? this.$ctx.store.defaultLocale,
      defaultLocale: this.$ctx.store.defaultLocale,
      defaultCurrency: this.$ctx.store.defaultCurrency,
      locales: [...this.$ctx.store.locales],
      currencies: [...this.$ctx.store.currencies],
      requestId: this.$ctx.requestId,
    };
  }

  private async runMutationWorkflow<TResult>(
    operation: string,
    input: unknown,
    resourceId: string,
  ): Promise<TResult> {
    return (await this.$ctx.kernel.getServices().broker.runWorkflow(
      `pricing.${operation}`,
      input,
      {
        source: "workflow",
        workflowId: `${operation}:${resourceId}:${this.$ctx.requestId}`,
        stepId: "start",
      },
    )) as TResult;
  }

  private clearDiscountUpdateLoaders(
    discountId: string,
    input: DiscountUpdateWorkflowInput,
  ) {
    this.$ctx.loaders.discount.clear(discountId);
    this.$ctx.loaders.discountRule.clear(discountId);
    this.$ctx.loaders.discountMinimumRequirement.clear(discountId);
    this.$ctx.loaders.discountTargetSelections.clear(discountId);
    this.$ctx.loaders.discountTargets.clear(discountId);
    this.$ctx.loaders.discountBuyerContext.clear(discountId);
    this.$ctx.loaders.discountEligibleCustomers.clear(discountId);
    this.$ctx.loaders.discountEligibleSegments.clear(discountId);
    this.$ctx.loaders.discountChannels.clear(discountId);
    this.$ctx.loaders.discountCombinations.clear(discountId);
    this.$ctx.loaders.discountUsageSummary.clear(discountId);

    for (const operation of input.operations) {
      if (operation.type !== "discountCodesUpdate") continue;
      for (const item of operation.params.update ?? []) {
        this.$ctx.loaders.discountCode.clear(item.codeId);
      }
      for (const item of operation.params.delete ?? []) {
        this.$ctx.loaders.discountCode.clear(item.codeId);
      }
    }
  }
}
