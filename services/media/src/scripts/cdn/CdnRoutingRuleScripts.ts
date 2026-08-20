import { BaseScript, ZodSchema, ValidationError, toUserErrors } from "../../kernel/BaseScript.js";
import type { UserError } from "../../kernel/BaseScript.js";
import type {
  CdnRoutingConditions,
  CdnRoutingRule,
  CdnTransformOverrides,
} from "../../repositories/models/index.js";
import {
  cdnRoutingRuleCreateSchema,
  cdnRoutingRuleUpdateSchema,
  cdnRoutingRuleIdSchema,
} from "./dto/CdnRoutingRuleDto.js";

export interface CdnRoutingRuleCreateParams {
  cdnConfigurationId: string;
  name: string;
  priority?: number;
  enabled?: boolean;
  conditions?: CdnRoutingConditions;
  transformOverrides?: CdnTransformOverrides;
}

export interface CdnRoutingRuleUpdateParams extends Partial<CdnRoutingRuleCreateParams> {
  id: string;
}

export interface CdnRoutingRuleIdParams {
  id: string;
}

export interface CdnRoutingRuleResult {
  routingRule: CdnRoutingRule | null;
  userErrors: UserError[];
}

export interface CdnRoutingRuleDeleteResult {
  deletedRoutingRuleId: string | null;
  userErrors: UserError[];
}

export class CdnRoutingRuleCreateScript extends BaseScript<
  CdnRoutingRuleCreateParams,
  CdnRoutingRuleResult
> {
  @ZodSchema(cdnRoutingRuleCreateSchema)
  protected async execute(params: CdnRoutingRuleCreateParams): Promise<CdnRoutingRuleResult> {
    const assetGroup = await this.getOrCreateStoreAssetGroup();
    const configuration = await this.repository.cdnConfiguration.findById(
      assetGroup.id,
      params.cdnConfigurationId,
    );
    if (!configuration) {
      return {
        routingRule: null,
        userErrors: [
          {
            field: ["cdnConfigurationId"],
            code: "NOT_FOUND",
            message: "CDN configuration not found",
          },
        ],
      };
    }

    return {
      routingRule: await this.repository.cdnRoutingRule.create(assetGroup.id, params),
      userErrors: [],
    };
  }

  protected handleError(error: unknown): CdnRoutingRuleResult {
    if (error instanceof ValidationError) {
      return { routingRule: null, userErrors: toUserErrors(error) };
    }
    return {
      routingRule: null,
      userErrors: [
        { code: "CDN_ROUTING_RULE_CREATE_FAILED", message: "Failed to create CDN routing rule" },
      ],
    };
  }
}

export class CdnRoutingRuleUpdateScript extends BaseScript<
  CdnRoutingRuleUpdateParams,
  CdnRoutingRuleResult
> {
  @ZodSchema(cdnRoutingRuleUpdateSchema)
  protected async execute(params: CdnRoutingRuleUpdateParams): Promise<CdnRoutingRuleResult> {
    const { id, ...changes } = params;
    // DB columns are non-null jsonb; an explicit null means "clear it".
    if ("transformOverrides" in changes && changes.transformOverrides === null) {
      changes.transformOverrides = {};
    }
    if ("conditions" in changes && changes.conditions === null) {
      changes.conditions = {};
    }

    const assetGroup = await this.getOrCreateStoreAssetGroup();
    const existing = await this.repository.cdnRoutingRule.findById(assetGroup.id, id);
    if (!existing) {
      return {
        routingRule: null,
        userErrors: [{ field: ["id"], code: "NOT_FOUND", message: "CDN routing rule not found" }],
      };
    }

    if (changes.cdnConfigurationId) {
      const configuration = await this.repository.cdnConfiguration.findById(
        assetGroup.id,
        changes.cdnConfigurationId,
      );
      if (!configuration) {
        return {
          routingRule: null,
          userErrors: [
            {
              field: ["cdnConfigurationId"],
              code: "NOT_FOUND",
              message: "CDN configuration not found",
            },
          ],
        };
      }
    }

    return {
      routingRule: await this.repository.cdnRoutingRule.update(assetGroup.id, id, changes),
      userErrors: [],
    };
  }

  protected handleError(error: unknown): CdnRoutingRuleResult {
    if (error instanceof ValidationError) {
      return { routingRule: null, userErrors: toUserErrors(error) };
    }
    return {
      routingRule: null,
      userErrors: [
        { code: "CDN_ROUTING_RULE_UPDATE_FAILED", message: "Failed to update CDN routing rule" },
      ],
    };
  }
}

export class CdnRoutingRuleDeleteScript extends BaseScript<
  CdnRoutingRuleIdParams,
  CdnRoutingRuleDeleteResult
> {
  @ZodSchema(cdnRoutingRuleIdSchema)
  protected async execute(params: CdnRoutingRuleIdParams): Promise<CdnRoutingRuleDeleteResult> {
    const assetGroup = await this.getOrCreateStoreAssetGroup();
    const deleted = await this.repository.cdnRoutingRule.delete(assetGroup.id, params.id);
    return deleted
      ? { deletedRoutingRuleId: params.id, userErrors: [] }
      : {
          deletedRoutingRuleId: null,
          userErrors: [{ field: ["id"], code: "NOT_FOUND", message: "CDN routing rule not found" }],
        };
  }

  protected handleError(error: unknown): CdnRoutingRuleDeleteResult {
    if (error instanceof ValidationError) {
      return { deletedRoutingRuleId: null, userErrors: toUserErrors(error) };
    }
    return {
      deletedRoutingRuleId: null,
      userErrors: [
        { code: "CDN_ROUTING_RULE_DELETE_FAILED", message: "Failed to delete CDN routing rule" },
      ],
    };
  }
}
