import type { UserError } from "../../kernel/BaseScript.js";
import type {
  DiscountBuyerContextInput,
  DiscountChannelInput,
  DiscountClass,
  DiscountCodesUpdateInput,
  DiscountDefinitionUpdateInput,
  DiscountFunctionBindingInput,
  DiscountLifecycleUpdateInput,
  DiscountMinimumRequirementSyncInput,
  DiscountRuleInput,
  DiscountTargetSelectionInput,
} from "../../resolvers/admin/generated/types.js";

export interface PricingMutationWorkflowContext {
  organizationId: string;
  storeId: string;
  userId?: string;
  locale?: string;
  defaultLocale?: string;
  defaultCurrency?: string;
  locales?: string[];
  currencies?: string[];
  requestId: string;
}

export interface DiscountUpdateOperationMeta {
  fieldPrefix: string[];
}

export type DiscountUpdateOperation =
  | {
      type: "discountDefinitionUpdate";
      params: DiscountDefinitionUpdateInput;
      meta: DiscountUpdateOperationMeta;
    }
  | {
      type: "discountRuleUpdate";
      params: DiscountRuleInput;
      meta: DiscountUpdateOperationMeta;
    }
  | {
      type: "discountFunctionBindingUpdate";
      params: DiscountFunctionBindingInput;
      meta: DiscountUpdateOperationMeta;
    }
  | {
      type: "discountMinimumRequirementUpdate";
      params: DiscountMinimumRequirementSyncInput;
      meta: DiscountUpdateOperationMeta;
    }
  | {
      type: "discountTargetsUpdate";
      params: { items: DiscountTargetSelectionInput[] };
      meta: DiscountUpdateOperationMeta;
    }
  | {
      type: "discountEligibilityUpdate";
      params: DiscountBuyerContextInput;
      meta: DiscountUpdateOperationMeta;
    }
  | {
      type: "discountCodesUpdate";
      params: DiscountCodesUpdateInput;
      meta: DiscountUpdateOperationMeta;
    }
  | {
      type: "discountTagsUpdate";
      params: { items: string[] };
      meta: DiscountUpdateOperationMeta;
    }
  | {
      type: "discountChannelsUpdate";
      params: { items: DiscountChannelInput[] };
      meta: DiscountUpdateOperationMeta;
    }
  | {
      type: "discountCombinationsUpdate";
      params: { items: DiscountClass[] };
      meta: DiscountUpdateOperationMeta;
    }
  | {
      type: "discountLifecycleUpdate";
      params: DiscountLifecycleUpdateInput;
      meta: DiscountUpdateOperationMeta;
    }
  | {
      type: "discountMetadataUpdate";
      params: { metadata: Record<string, unknown> };
      meta: DiscountUpdateOperationMeta;
    };

export interface DiscountUpdateWorkflowInput {
  discountId: string;

  operations: DiscountUpdateOperation[];
  context: PricingMutationWorkflowContext;
}

export interface DiscountUpdateOperationResult {
  type: DiscountUpdateOperation["type"];
  applied: boolean;
  errors: UserError[];
}

export interface DiscountUpdateWorkflowResult {
  discount: { id: string } | null;
  operationResults: DiscountUpdateOperationResult[];
  userErrors: UserError[];
}
