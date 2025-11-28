import {
  UseCase,
  type UseCaseDependencies,
} from "@src/application/usecases/useCase";
import type { CheckoutLinesAddInput } from "@src/application/checkout/types";
import type { CheckoutLinesAddedDto } from "@src/domain/checkout/dto";
import { Money } from "@shopana/shared-money";
import { v7 as uuidv7 } from "uuid";
import { CheckoutLineItemState, ChildPriceType } from "@src/domain/checkout/types";
import type { GetOffersItem, GetOffersChildItem } from "@src/application/services/checkoutService";
import type { InventoryOffer } from "@shopana/shared-service-api";

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
   * Children are validated against product groups and prices come from DB.
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

      // Process children - no priceConfig from client, it comes from DB
      const children = line.children?.map((child) => ({
        lineId: uuidv7(),
        purchasableId: child.purchasableId,
        quantity: child.quantity,
      }));

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

    // Build nested items structure for inventory
    const inventoryItems: GetOffersItem[] = [];

    // Add new lines with nested children
    for (const line of addedLines) {
      const item: GetOffersItem = {
        lineId: line.lineId,
        purchasableId: line.purchasableId,
        quantity: line.quantity,
      };

      if (line.children && line.children.length > 0) {
        item.children = line.children.map((child): GetOffersChildItem => ({
          lineId: child.lineId,
          purchasableId: child.purchasableId,
          quantity: child.quantity,
        }));
      }

      inventoryItems.push(item);
    }

    // Add preserved lines (without children - they are already saved)
    for (const l of preservedLines) {
      if (!l.parentLineId) {
        // Only add parent lines, children will be handled separately
        inventoryItems.push({
          lineId: l.lineId,
          purchasableId: l.unit.id,
          quantity: l.quantity,
        });
      }
    }

    // Get product information from inventory
    const ctx = context;
    const { offers } = await this.checkoutService.getOffers({
      apiKey: ctx.apiKey,
      currency: state.currencyCode,
      projectId: ctx.project.id,
      items: inventoryItems,
    });

    // Build offers map by lineId for easy lookup
    const offersByLineId = new Map<string, InventoryOffer>();
    for (const offer of offers) {
      const lineId = (offer.providerPayload as { lineId?: string })?.lineId;
      if (lineId) {
        offersByLineId.set(lineId, offer);
      }
    }

    const newLines: CheckoutLineItemState[] = [];

    for (const line of addedLines) {
      const offer = offersByLineId.get(line.lineId);
      if (!offer) {
        throw new Error(`Product ${line.purchasableId} not found in inventory`);
      }
      if (!offer.isAvailable) {
        throw new Error(`Product ${line.purchasableId} is not available`);
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

      // Create child lines from offer.children (prices come from inventory/DB)
      if (offer.children && line.children) {
        for (let i = 0; i < line.children.length; i++) {
          const childInput = line.children[i];
          const childOffer = offer.children[i];

          if (!childOffer) {
            throw new Error(`Child product ${childInput.purchasableId} not found in inventory response`);
          }

          // Check for validation errors from inventory
          if (childOffer.validationError) {
            throw new Error(`Validation error for ${childInput.purchasableId}: ${childOffer.validationError}`);
          }

          if (!childOffer.isAvailable) {
            throw new Error(`Child product ${childInput.purchasableId} is not available`);
          }

          const childOriginalPrice = Money.fromMinor(BigInt(childOffer.unitOriginalPrice ?? childOffer.unitPrice));

          // Get priceConfig from offer (comes from DB via inventory)
          const priceConfig = childOffer.appliedPriceConfig
            ? {
                type: childOffer.appliedPriceConfig.type as ChildPriceType,
                amount: childOffer.appliedPriceConfig.amount,
                percent: childOffer.appliedPriceConfig.percent,
              }
            : null;

          newLines.push({
            lineId: childInput.lineId,
            parentLineId: line.lineId,
            priceConfig,
            quantity: childInput.quantity,
            tag: null, // Children don't have tags
            unit: {
              id: childInput.purchasableId,
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
