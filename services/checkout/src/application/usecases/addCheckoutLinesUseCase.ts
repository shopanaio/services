import {
  UseCase,
  type UseCaseDependencies,
} from "@src/application/usecases/useCase";
import type { CheckoutLinesAddInput, CheckoutChildLineInput } from "@src/application/checkout/types";
import type { CheckoutLinesAddedDto } from "@src/domain/checkout/dto";
import { Money } from "@shopana/shared-money";
import { v7 as uuidv7 } from "uuid";
import { CheckoutLineItemState, ChildPriceType } from "@src/domain/checkout/types";

/**
 * Local type for price config input (matches plugin-sdk ChildPriceConfigInput)
 * TODO: Remove after plugin-sdk rebuild and use imported type
 */
type ChildPriceConfigInput = {
  type: string;
  amount?: number;
  percent?: number;
};

export interface AddCheckoutLinesUseCaseDependencies
  extends UseCaseDependencies {}

export class AddCheckoutLinesUseCase extends UseCase<
  CheckoutLinesAddInput,
  string
> {
  constructor(deps: AddCheckoutLinesUseCaseDependencies) {
    super(deps);
  }

  /**
   * Adding lines to checkout.
   * Duplicates by purchasable id in request are summed up.
   * Even if a line with such purchasable id already exists, we add a new line.
   * Supports parent/child relationships for bundles.
   */
  async execute(input: CheckoutLinesAddInput): Promise<string> {
    const { apiKey, project, customer, user, ...businessInput } = input;
    const context = { apiKey, project, customer, user };

    const state = await this.getCheckoutState(businessInput.checkoutId);

    this.assertCheckoutExists(state);
    this.validateTenantAccess(state, context);
    this.validateCurrencyCode(state);

    const existingLines = Object.values(state.linesRecord ?? {});
    const tagRecordBySlug = state.tagsRecord ?? {};

    type IncomingLine = {
      lineId: string;
      quantity: number;
      purchasableId: string;
      tag: CheckoutLineItemState["tag"];
      children?: Array<{
        lineId: string;
        purchasableId: string;
        quantity: number;
        priceConfig: ChildPriceConfigInput | undefined;
      }>;
    };

    const aggregatedLines = new Map<string, IncomingLine>();

    for (const line of businessInput.lines) {
      const tagSlug = line.tagSlug ?? null;
      let tag: CheckoutLineItemState["tag"] = null;

      if (tagSlug) {
        const tagRecord = tagRecordBySlug[tagSlug];
        if (!tagRecord) {
          throw new Error(`Tag ${tagSlug} is not defined for this checkout`);
        }

        tag = {
          id: tagRecord.id,
          slug: tagRecord.slug,
          isUnique: tagRecord.isUnique,
        };
      }

      const key = AddCheckoutLinesUseCase.makeAggregationKey(
        line.purchasableId,
        tag
      );
      const existing = aggregatedLines.get(key);

      if (existing) {
        if (tag?.isUnique) {
          throw new Error(
            `Tag ${tag.slug} is unique and can be used only once per request`
          );
        }
        existing.quantity += line.quantity;
        continue;
      }

      // Process children if present
      const children = line.children?.map((child) => {
        this.validatePriceConfig(child);
        return {
          lineId: uuidv7(),
          purchasableId: child.purchasableId,
          quantity: child.quantity,
          priceConfig: this.buildPriceConfig(child),
        };
      });

      aggregatedLines.set(key, {
        lineId: uuidv7(),
        quantity: line.quantity,
        purchasableId: line.purchasableId,
        tag,
        children,
      });
    }

    const addedLines = Array.from(aggregatedLines.values());
    const uniqueTags = new Set(
      addedLines
        .filter((line) => line.tag?.isUnique)
        .map((line) => line.tag!.slug)
    );

    const preservedLines = existingLines.filter((line) => {
      const slug = line.tag?.slug;
      if (!slug) return true;
      return !uniqueTags.has(slug);
    });

    // Build items list including children
    const inventoryItems: Array<{
      lineId: string;
      purchasableId: string;
      quantity: number;
      parentLineId?: string;
      priceConfig?: ChildPriceConfigInput;
    }> = [];

    // Add parent lines
    for (const line of addedLines) {
      inventoryItems.push({
        lineId: line.lineId,
        purchasableId: line.purchasableId,
        quantity: line.quantity,
      });
      // Add children with parent reference
      for (const child of line.children ?? []) {
        inventoryItems.push({
          lineId: child.lineId,
          purchasableId: child.purchasableId,
          quantity: child.quantity,
          parentLineId: line.lineId,
          priceConfig: child.priceConfig,
        });
      }
    }

    // Add preserved lines
    for (const l of preservedLines) {
      inventoryItems.push({
        lineId: l.lineId,
        purchasableId: l.unit.id,
        quantity: l.quantity,
      });
    }

    // Get product information from inventory
    const ctx = context;
    const { offers } = await this.checkoutService.getOffers({
      apiKey: ctx.apiKey,
      currency: state.currencyCode,
      projectId: ctx.project.id,
      items: inventoryItems,
    });

    const newLines: CheckoutLineItemState[] = [];

    for (const line of addedLines) {
      const offer = offers.get(line.purchasableId);
      if (!offer?.isAvailable) {
        throw new Error(`Product not found in inventory`);
      }

      const originalPrice = Money.fromMinor(BigInt(offer.unitOriginalPrice ?? offer.unitPrice));

      // Create parent line
      newLines.push({
        lineId: line.lineId,
        parentLineId: null,
        priceConfig: null,
        quantity: line.quantity,
        tag: line.tag,
        unit: {
          id: line.purchasableId,
          title: offer.purchasableSnapshot?.title ?? "",
          sku: offer.purchasableSnapshot?.sku ?? null,
          price: Money.fromMinor(BigInt(offer.unitPrice)),
          originalPrice,
          compareAtPrice:
            offer.unitCompareAtPrice != null
              ? Money.fromMinor(BigInt(offer.unitCompareAtPrice))
              : null,
          imageUrl: offer.purchasableSnapshot?.imageUrl ?? null,
          snapshot: offer.purchasableSnapshot?.data ?? null,
        },
      });

      // Create child lines
      for (const child of line.children ?? []) {
        const childOffer = offers.get(child.purchasableId);
        if (!childOffer?.isAvailable) {
          throw new Error(`Child product not found in inventory`);
        }

        const childOriginalPrice = Money.fromMinor(BigInt(childOffer.unitOriginalPrice ?? childOffer.unitPrice));

        newLines.push({
          lineId: child.lineId,
          parentLineId: line.lineId,
          priceConfig: child.priceConfig
            ? {
                type: child.priceConfig.type as ChildPriceType,
                amount: child.priceConfig.amount,
                percent: child.priceConfig.percent,
              }
            : null,
          quantity: child.quantity,
          tag: null, // Children don't have tags
          unit: {
            id: child.purchasableId,
            title: childOffer.purchasableSnapshot?.title ?? "",
            sku: childOffer.purchasableSnapshot?.sku ?? null,
            price: Money.fromMinor(BigInt(childOffer.unitPrice)),
            originalPrice: childOriginalPrice,
            compareAtPrice:
              childOffer.unitCompareAtPrice != null
                ? Money.fromMinor(BigInt(childOffer.unitCompareAtPrice))
                : null,
            imageUrl: childOffer.purchasableSnapshot?.imageUrl ?? null,
            snapshot: childOffer.purchasableSnapshot?.data ?? null,
          },
        });
      }
    }

    const checkoutLines = [...preservedLines, ...newLines];
    const computed = await this.checkoutService.computeTotals({
      projectId: context.project.id,
      checkoutLines,
      appliedDiscounts: state.appliedDiscounts,
      currency: state.currencyCode,
    });

    const dto: CheckoutLinesAddedDto = {
      data: {
        checkoutLines: this.mapLinesToDtoLines(checkoutLines),
        checkoutLinesCost: computed.checkoutLinesCost,
        checkoutCost: computed.checkoutCost,
      },
      metadata: this.createMetadataDto(businessInput.checkoutId, context),
    };

    await this.checkoutWriteRepository.applyCheckoutLines(dto);

    return input.checkoutId;
  }

  /**
   * Validates price config values are positive
   */
  private validatePriceConfig(child: CheckoutChildLineInput): void {
    if (child.priceAmount != null && child.priceAmount < 0) {
      throw new Error("priceAmount must be positive");
    }
    if (child.pricePercent != null && child.pricePercent < 0) {
      throw new Error("pricePercent must be positive");
    }
  }

  /**
   * Builds ChildPriceConfigInput from child line input
   */
  private buildPriceConfig(
    child: CheckoutChildLineInput
  ): ChildPriceConfigInput | undefined {
    if (!child.priceType) {
      return undefined;
    }
    return {
      type: child.priceType,
      amount: child.priceAmount ?? undefined,
      percent: child.pricePercent ?? undefined,
    };
  }

  private static makeAggregationKey(
    purchasableId: string,
    tag: CheckoutLineItemState["tag"]
  ): string {
    if (!tag) {
      return `purchasable:${purchasableId}`;
    }

    if (tag.isUnique) {
      return `unique:${tag.slug}`;
    }

    return `tagged:${purchasableId}:${tag.slug}`;
  }
}
