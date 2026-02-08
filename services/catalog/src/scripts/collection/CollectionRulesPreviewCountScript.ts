import { and, eq } from "drizzle-orm";
import { BaseScript } from "../../kernel/BaseScript.js";
import {
  productSearchIndex,
  type VariantSearchIndex,
} from "../../repositories/models/index.js";
import type { CollectionRuleInput } from "./dto/index.js";

interface RuleContext {
  tagIn: string[];
  tagAll: string[];
  featureIn: string[];
  categoryIn: string[];
  createdFrom?: string;
  createdTo?: string;
  optionIn: string[];
  priceMin?: number;
  priceMax?: number;
  inStock?: boolean;
}

export interface CollectionRulesPreviewCountParams {
  rules: CollectionRuleInput[];
}

export interface CollectionRulesPreviewCountResult {
  count: number;
}

export class CollectionRulesPreviewCountScript extends BaseScript<
  CollectionRulesPreviewCountParams,
  CollectionRulesPreviewCountResult
> {
  protected async execute(
    params: CollectionRulesPreviewCountParams
  ): Promise<CollectionRulesPreviewCountResult> {
    const currency =
      this.context.currency ?? this.context.store.defaultCurrency ?? "USD";

    const rules = this.compileRules(params.rules);
    const publishedRows = await this.repository.db
      .select()
      .from(productSearchIndex)
      .where(
        and(
          eq(productSearchIndex.projectId, this.getProjectId()),
          eq(productSearchIndex.status, "published")
        )
      );

    const productFiltered = publishedRows.filter((row) =>
      this.productMatchesRuleContext(row, rules)
    );
    if (productFiltered.length === 0) {
      return { count: 0 };
    }

    const hasVariantRules =
      rules.optionIn.length > 0 ||
      rules.priceMin !== undefined ||
      rules.priceMax !== undefined ||
      rules.inStock !== undefined;

    if (!hasVariantRules) {
      return { count: productFiltered.length };
    }

    const variants = await this.repository.variantSearchIndex.getByProductIds(
      productFiltered.map((row) => row.productId)
    );
    const byProduct = new Map<string, VariantSearchIndex[]>();
    for (const variant of variants) {
      const list = byProduct.get(variant.productId) ?? [];
      list.push(variant);
      byProduct.set(variant.productId, list);
    }

    const count = productFiltered.filter((row) =>
      (byProduct.get(row.productId) ?? []).some((variant) =>
        this.variantMatchesFilters(
          variant,
          rules.optionIn,
          rules.priceMin,
          rules.priceMax,
          rules.inStock,
          currency
        )
      )
    ).length;

    return { count };
  }

  protected handleError(_error: unknown): CollectionRulesPreviewCountResult {
    return { count: 0 };
  }

  private compileRules(rules: CollectionRuleInput[]): RuleContext {
    const ctx: RuleContext = {
      tagIn: [],
      tagAll: [],
      featureIn: [],
      categoryIn: [],
      optionIn: [],
    };

    for (const rule of rules) {
      if (rule.field === "tag" && (rule.operator === "in" || rule.operator === "contains")) {
        ctx.tagIn.push(...this.ensureArray(rule.value));
      } else if (rule.field === "tag" && rule.operator === "all") {
        ctx.tagAll.push(...this.ensureArray(rule.value));
      } else if (
        rule.field === "feature" &&
        (rule.operator === "in" || rule.operator === "contains")
      ) {
        ctx.featureIn.push(...this.ensureArray(rule.value));
      } else if (
        rule.field === "category" &&
        (rule.operator === "in" || rule.operator === "contains")
      ) {
        ctx.categoryIn.push(...this.ensureArray(rule.value));
      } else if (
        rule.field === "option" &&
        (rule.operator === "in" || rule.operator === "contains")
      ) {
        ctx.optionIn.push(...this.ensureArray(rule.value));
      } else if (rule.field === "price") {
        const [min, max] = this.ensureRange(rule.operator, rule.value);
        if (min !== undefined) ctx.priceMin = min;
        if (max !== undefined) ctx.priceMax = max;
      } else if (rule.field === "in_stock" && rule.operator === "eq") {
        ctx.inStock = Boolean(rule.value);
      } else if (rule.field === "created_at") {
        const [from, to] = this.ensureDateRange(rule.operator, rule.value);
        if (from) ctx.createdFrom = from;
        if (to) ctx.createdTo = to;
      }
    }

    return ctx;
  }

  private productMatchesRuleContext(
    row: typeof productSearchIndex.$inferSelect,
    ctx: RuleContext
  ): boolean {
    if (ctx.tagIn.length > 0 && !ctx.tagIn.some((value) => row.tagHandles.includes(value))) {
      return false;
    }

    if (ctx.tagAll.length > 0 && !ctx.tagAll.every((value) => row.tagHandles.includes(value))) {
      return false;
    }

    if (
      ctx.featureIn.length > 0 &&
      !ctx.featureIn.some((value) => row.featureSlugs.includes(value))
    ) {
      return false;
    }

    if (
      ctx.categoryIn.length > 0 &&
      !ctx.categoryIn.some((value) => row.categoryHandles.includes(value))
    ) {
      return false;
    }

    if (ctx.createdFrom && row.createdAt < ctx.createdFrom) return false;
    if (ctx.createdTo && row.createdAt >= ctx.createdTo) return false;
    return true;
  }

  private variantMatchesFilters(
    variant: VariantSearchIndex,
    optionSlugs: string[],
    priceMinMinor: number | undefined,
    priceMaxMinor: number | undefined,
    inStock: boolean | undefined,
    currency: string
  ): boolean {
    if (variant.priceCurrency !== currency) return false;
    if (optionSlugs.length > 0) {
      const hasOption = optionSlugs.some((value) => variant.optionSlugs.includes(value));
      if (!hasOption) return false;
    }
    if (priceMinMinor !== undefined) {
      if (variant.priceMinor === null || variant.priceMinor < priceMinMinor) return false;
    }
    if (priceMaxMinor !== undefined) {
      if (variant.priceMinor === null || variant.priceMinor > priceMaxMinor) return false;
    }
    if (inStock !== undefined && variant.inStock !== inStock) return false;
    return true;
  }

  private ensureArray(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === "string");
    }
    if (typeof value === "string") return [value];
    return [];
  }

  private ensureRange(operator: string, value: unknown): [number | undefined, number | undefined] {
    if (operator === "between" && Array.isArray(value) && value.length >= 2) {
      return [Number(value[0]), Number(value[1])];
    }
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return [undefined, undefined];
    if (operator === "eq") return [numeric, numeric];
    if (operator === "gt") return [numeric + 1, undefined];
    if (operator === "gte") return [numeric, undefined];
    if (operator === "lt") return [undefined, numeric - 1];
    if (operator === "lte") return [undefined, numeric];
    return [undefined, undefined];
  }

  private ensureDateRange(
    operator: string,
    value: unknown
  ): [string | undefined, string | undefined] {
    if (operator === "between" && Array.isArray(value) && value.length >= 2) {
      return [String(value[0]), String(value[1])];
    }
    const date = String(value);
    if (operator === "eq") return [date, date];
    if (operator === "gt" || operator === "gte") return [date, undefined];
    if (operator === "lt" || operator === "lte") return [undefined, date];
    return [undefined, undefined];
  }
}
