import { BaseScript } from "../../kernel/BaseScript.js";
import type { UserError } from "../../kernel/BaseScript.js";
import type {
  CdnRoutingConditions,
  CdnRoutingRule,
  CdnTransformOverrides,
} from "../../repositories/models/index.js";

export interface CdnRoutingRuleCreateParams {
  cdnConfigurationId: string;
  name: string;
  priority?: number;
  enabled?: boolean;
  conditions?: CdnRoutingConditions;
  transformOverrides?: CdnTransformOverrides;
}

export interface CdnRoutingRuleUpdateParams
  extends Partial<CdnRoutingRuleCreateParams> {
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

function validateName(name: string | undefined): UserError[] {
  return name?.trim()
    ? []
    : [{ field: ["name"], code: "REQUIRED", message: "Name is required" }];
}

function validateConditions(conditions: unknown): UserError[] {
  if (conditions === undefined) return [];
  if (!conditions || typeof conditions !== "object" || Array.isArray(conditions)) {
    return [{
      field: ["conditions"],
      code: "INVALID_CONDITIONS",
      message: "conditions must be an object",
    }];
  }

  const value = conditions as Record<string, unknown>;
  const errors: UserError[] = [];
  for (const key of [
    "mediaTypes",
    "mimeTypes",
    "providers",
    "extensions",
    "countries",
  ]) {
    const condition = value[key];
    if (
      condition !== undefined &&
      (!Array.isArray(condition) || condition.some((item) => typeof item !== "string"))
    ) {
      errors.push({
        field: ["conditions", key],
        code: "INVALID_CONDITION",
        message: `${key} must be an array of strings`,
      });
    }
  }

  for (const key of ["minSizeBytes", "maxSizeBytes"]) {
    const condition = value[key];
    if (
      condition !== undefined &&
      (typeof condition !== "number" || !Number.isFinite(condition) || condition < 0)
    ) {
      errors.push({
        field: ["conditions", key],
        code: "INVALID_CONDITION",
        message: `${key} must be a non-negative finite number`,
      });
    }
  }

  if (
    typeof value.minSizeBytes === "number" &&
    typeof value.maxSizeBytes === "number" &&
    value.minSizeBytes > value.maxSizeBytes
  ) {
    errors.push({
      field: ["conditions", "maxSizeBytes"],
      code: "INVALID_CONDITION_RANGE",
      message: "maxSizeBytes must be greater than or equal to minSizeBytes",
    });
  }
  return errors;
}

function validateTransformOverrides(value: unknown): UserError[] {
  if (
    value === undefined ||
    value === null ||
    (typeof value === "object" && !Array.isArray(value))
  ) {
    return [];
  }
  return [{
    field: ["transformOverrides"],
    code: "INVALID_TRANSFORM_OVERRIDES",
    message: "transformOverrides must be an object",
  }];
}

export class CdnRoutingRuleCreateScript extends BaseScript<
  CdnRoutingRuleCreateParams,
  CdnRoutingRuleResult
> {
  protected async execute(
    params: CdnRoutingRuleCreateParams
  ): Promise<CdnRoutingRuleResult> {
    const userErrors = [
      ...validateName(params.name),
      ...validateConditions(params.conditions),
      ...validateTransformOverrides(params.transformOverrides),
    ];
    if (userErrors.length > 0) return { routingRule: null, userErrors };

    const assetGroup = await this.getOrCreateStoreAssetGroup();
    const configuration = await this.repository.cdnConfiguration.findById(
      assetGroup.id,
      params.cdnConfigurationId
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
      routingRule: await this.repository.cdnRoutingRule.create(assetGroup.id, {
        ...params,
        name: params.name.trim(),
      }),
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): CdnRoutingRuleResult {
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
  protected async execute(
    params: CdnRoutingRuleUpdateParams
  ): Promise<CdnRoutingRuleResult> {
    const { id, ...changes } = params;
    const conditionErrors = validateConditions(changes.conditions);
    const transformErrors = validateTransformOverrides(
      changes.transformOverrides
    );
    if (conditionErrors.length > 0 || transformErrors.length > 0) {
      return {
        routingRule: null,
        userErrors: [...conditionErrors, ...transformErrors],
      };
    }
    if (
      "transformOverrides" in changes &&
      changes.transformOverrides === null
    ) {
      changes.transformOverrides = {};
    }
    if (changes.name !== undefined) {
      const errors = validateName(changes.name);
      if (errors.length > 0) return { routingRule: null, userErrors: errors };
      changes.name = changes.name.trim();
    }

    const assetGroup = await this.getOrCreateStoreAssetGroup();
    const existing = await this.repository.cdnRoutingRule.findById(
      assetGroup.id,
      id
    );
    if (!existing) {
      return {
        routingRule: null,
        userErrors: [
          { field: ["id"], code: "NOT_FOUND", message: "CDN routing rule not found" },
        ],
      };
    }

    if (changes.cdnConfigurationId) {
      const configuration = await this.repository.cdnConfiguration.findById(
        assetGroup.id,
        changes.cdnConfigurationId
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
      routingRule: await this.repository.cdnRoutingRule.update(
        assetGroup.id,
        id,
        changes
      ),
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): CdnRoutingRuleResult {
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
  protected async execute(
    params: CdnRoutingRuleIdParams
  ): Promise<CdnRoutingRuleDeleteResult> {
    const assetGroup = await this.getOrCreateStoreAssetGroup();
    const deleted = await this.repository.cdnRoutingRule.delete(
      assetGroup.id,
      params.id
    );
    return deleted
      ? { deletedRoutingRuleId: params.id, userErrors: [] }
      : {
          deletedRoutingRuleId: null,
          userErrors: [
            { field: ["id"], code: "NOT_FOUND", message: "CDN routing rule not found" },
          ],
        };
  }

  protected handleError(_error: unknown): CdnRoutingRuleDeleteResult {
    return {
      deletedRoutingRuleId: null,
      userErrors: [
        { code: "CDN_ROUTING_RULE_DELETE_FAILED", message: "Failed to delete CDN routing rule" },
      ],
    };
  }
}
