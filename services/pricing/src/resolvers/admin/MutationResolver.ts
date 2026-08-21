import {
  decodeGlobalIdByType,
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { ApolloMutation, ZodResolver } from "@shopana/type-resolver";
import type {
  PricingMutationDiscountCreateArgs,
  PricingMutationDiscountDeleteArgs,
  PricingMutationDiscountExternalReferenceCreateArgs,
  PricingMutationDiscountExternalReferenceDeleteArgs,
  PricingMutationDiscountExternalReferenceUpdateArgs,
  PricingMutationDiscountUpdateArgs,
} from "./generated/types.js";
import { DiscountOperationType } from "./generated/types.js";
import type {
  DiscountCreateWorkflowInput,
  DiscountCreateWorkflowResult,
  DiscountDeleteWorkflowInput,
  DiscountDeleteWorkflowResult,
  DiscountExternalReferenceCreateWorkflowInput,
  DiscountExternalReferenceCreateWorkflowResult,
  DiscountExternalReferenceDeleteWorkflowInput,
  DiscountExternalReferenceDeleteWorkflowResult,
  DiscountExternalReferenceUpdateWorkflowInput,
  DiscountExternalReferenceUpdateWorkflowResult,
  DiscountUpdateWorkflowInput,
  DiscountUpdateWorkflowResult,
  PricingMutationWorkflowContext,
} from "../../workflows/dto/index.js";
import { DiscountResolver } from "./DiscountResolver.js";
import { mapDiscountCreateInput } from "./discountCreateMapper.js";
import {
  mapDiscountUpdateInput,
  mapPreflightDiscountOperationResult,
  toGraphqlDiscountOperationType,
} from "./discountUpdateMapper.js";
import {
  DiscountCreateInputSchema,
  DiscountDeleteInputSchema,
  DiscountExternalReferenceCreateInputSchema,
  DiscountExternalReferenceDeleteInputSchema,
} from "./generated/schemas.js";
import { DiscountExternalReferenceResolver } from "./DiscountEntityResolver.js";
import { PricingType } from "./PricingType.js";

@ApolloMutation
export class MutationResolver extends PricingType<Record<string, never>> {
  pricingMutation() {
    return this.resolvers.pricingMutation();
  }
}

export class PricingMutationResolver extends PricingType<Record<string, never>> {
  @ZodResolver(DiscountCreateInputSchema())
  async discountCreate(args: PricingMutationDiscountCreateArgs) {
    const mapped = mapDiscountCreateInput(args.input);
    if (mapped.errors.length > 0) {
      return { discount: null, userErrors: mapped.errors };
    }

    const workflowInput: DiscountCreateWorkflowInput = {
      input: mapped.input,
      context: this.mutationWorkflowContext(),
    };
    const result = await this.runMutationWorkflow<DiscountCreateWorkflowResult>(
      "discountCreate",
      workflowInput,
      this.$ctx.store.id,
    );
    return {
      discount: result.discount ? new DiscountResolver(result.discount.id, this.$ctx) : null,
      userErrors: result.userErrors,
    };
  }

  @ZodResolver(DiscountDeleteInputSchema())
  async discountDelete(args: PricingMutationDiscountDeleteArgs) {
    let discountId: string;
    try {
      discountId = decodeGlobalIdByType(args.input.id, GlobalIdEntity.Discount);
    } catch {
      return {
        deletedDiscountId: null,
        userErrors: [
          {
            message: "Invalid ID format",
            field: ["input", "id"],
            code: "INVALID_ID",
          },
        ],
      };
    }

    const workflowInput: DiscountDeleteWorkflowInput = {
      discountId,

      context: this.mutationWorkflowContext(),
    };
    const result = await this.runMutationWorkflow<DiscountDeleteWorkflowResult>(
      "discountDelete",
      workflowInput,
      discountId,
    );

    this.clearDiscountLoaders(discountId);
    for (const codeId of result.deletedCodeIds) {
      this.$ctx.loaders.discountCode.clear(codeId);
    }
    return {
      deletedDiscountId: result.deletedDiscountId
        ? encodeGlobalIdByType(result.deletedDiscountId, GlobalIdEntity.Discount)
        : null,
      userErrors: result.userErrors,
    };
  }

  @ZodResolver(DiscountExternalReferenceCreateInputSchema())
  async discountExternalReferenceCreate(args: PricingMutationDiscountExternalReferenceCreateArgs) {
    let discountId: string;
    try {
      discountId = decodeGlobalIdByType(args.input.discountId, GlobalIdEntity.Discount);
    } catch {
      return {
        externalReference: null,
        userErrors: [invalidIdError(["input", "discountId"])],
      };
    }

    const workflowInput: DiscountExternalReferenceCreateWorkflowInput = {
      params: { input: { ...args.input, discountId } },
      context: this.mutationWorkflowContext(),
    };
    const result = await this.runMutationWorkflow<DiscountExternalReferenceCreateWorkflowResult>(
      "discountExternalReferenceCreate",
      workflowInput,
      discountId,
    );
    return {
      externalReference: result.externalReference
        ? new DiscountExternalReferenceResolver(result.externalReference.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  async discountExternalReferenceUpdate(args: PricingMutationDiscountExternalReferenceUpdateArgs) {
    let externalReferenceId: string;
    try {
      externalReferenceId = decodeGlobalIdByType(
        args.externalReferenceId,
        GlobalIdEntity.DiscountExternalReference,
      );
    } catch {
      const error = invalidIdError(["externalReferenceId"]);
      return {
        externalReference: null,
        operationResults: [externalReferenceOperationResult([error])],
        userErrors: [error],
      };
    }

    const workflowInput: DiscountExternalReferenceUpdateWorkflowInput = {
      params: {
        externalReferenceId,
        operations: args.operations,
      },
      context: this.mutationWorkflowContext(),
    };
    const result = await this.runMutationWorkflow<DiscountExternalReferenceUpdateWorkflowResult>(
      "discountExternalReferenceUpdate",
      workflowInput,
      externalReferenceId,
    );
    this.$ctx.loaders.discountExternalReference.clear(externalReferenceId);
    return {
      externalReference: result.externalReference
        ? new DiscountExternalReferenceResolver(result.externalReference.id, this.$ctx)
        : null,
      operationResults: result.operationResults.map((operation) => ({
        type: DiscountOperationType.ExternalReferenceUpdate,
        applied: operation.applied,
        errors: operation.errors,
      })),
      userErrors: result.userErrors,
    };
  }

  @ZodResolver(DiscountExternalReferenceDeleteInputSchema())
  async discountExternalReferenceDelete(args: PricingMutationDiscountExternalReferenceDeleteArgs) {
    let externalReferenceId: string;
    try {
      externalReferenceId = decodeGlobalIdByType(
        args.input.id,
        GlobalIdEntity.DiscountExternalReference,
      );
    } catch {
      return {
        deletedExternalReferenceId: null,
        userErrors: [invalidIdError(["input", "id"])],
      };
    }

    const workflowInput: DiscountExternalReferenceDeleteWorkflowInput = {
      params: {
        id: externalReferenceId,
        permanent: args.input.permanent ?? false,
      },
      context: this.mutationWorkflowContext(),
    };
    const result = await this.runMutationWorkflow<DiscountExternalReferenceDeleteWorkflowResult>(
      "discountExternalReferenceDelete",
      workflowInput,
      externalReferenceId,
    );
    this.$ctx.loaders.discountExternalReference.clear(externalReferenceId);
    return {
      deletedExternalReferenceId: result.deletedExternalReferenceId
        ? encodeGlobalIdByType(
            result.deletedExternalReferenceId,
            GlobalIdEntity.DiscountExternalReference,
          )
        : null,
      userErrors: result.userErrors,
    };
  }

  async discountUpdate(args: PricingMutationDiscountUpdateArgs) {
    const mapped = mapDiscountUpdateInput(args.operations);
    let discountId: string | undefined;
    try {
      discountId = decodeGlobalIdByType(args.discountId, GlobalIdEntity.Discount);
    } catch {
      const error = {
        message: "Invalid ID format",
        field: ["discountId"],
        code: "INVALID_ID",
      };
      return {
        discount: null,
        operationResults: mapped.entries.map(mapPreflightDiscountOperationResult),
        userErrors: [error, ...mapped.errors],
      };
    }

    if (mapped.errors.length > 0) {
      return {
        discount: null,
        operationResults: mapped.entries.map(mapPreflightDiscountOperationResult),
        userErrors: mapped.errors,
      };
    }

    const workflowInput: DiscountUpdateWorkflowInput = {
      discountId,

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
      discount: result.discount ? new DiscountResolver(result.discount.id, this.$ctx) : null,
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
      defaultCurrency: this.$ctx.store.currencyCode,
      locales: [...this.$ctx.store.locales],
      currencies: [this.$ctx.store.currencyCode],
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
      { adminContext: this.$ctx.adminContext },
    )) as TResult;
  }

  private clearDiscountUpdateLoaders(discountId: string, input: DiscountUpdateWorkflowInput) {
    this.clearDiscountLoaders(discountId);

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

  private clearDiscountLoaders(discountId: string) {
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
  }
}

function invalidIdError(field: string[]) {
  return { message: "Invalid ID format", field, code: "INVALID_ID" };
}

function externalReferenceOperationResult(
  errors: Array<{ message: string; field?: string[]; code?: string }>,
) {
  return {
    type: DiscountOperationType.ExternalReferenceUpdate,
    applied: errors.length === 0,
    errors,
  };
}
