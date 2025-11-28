import {
  UseCase,
  type UseCaseDependencies,
} from "@src/application/usecases/useCase";
import type { CheckoutLinesAddInput } from "@src/application/checkout/types";
import type { CheckoutLinesAddedDto } from "@src/domain/checkout/dto";
import { Money } from "@shopana/shared-money";
import { v7 as uuidv7 } from "uuid";
import { CheckoutLineItemState } from "@src/domain/checkout/types";

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

      aggregatedLines.set(key, {
        lineId: uuidv7(),
        quantity: line.quantity,
        purchasableId: line.purchasableId,
        tag,
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

    // Get product information from inventory
    const ctx = context;
    const { offers } = await this.checkoutService.getOffers({
      apiKey: ctx.apiKey,
      currency: state.currencyCode,
      projectId: ctx.project.id,
      items: [
        ...addedLines,
        ...preservedLines.map((l) => ({
          lineId: l.lineId,
          purchasableId: l.unit.id,
          quantity: l.quantity,
        })),
      ],
    });

    const newLines: CheckoutLineItemState[] = addedLines.map((l) => {
      const offer = offers.get(l.purchasableId);
      if (!offer?.isAvailable) {
        throw new Error(`Product not found in inventory`);
      }

      return {
        lineId: l.lineId,
        quantity: l.quantity,
        tag: l.tag,
        unit: {
          id: l.purchasableId,
          title: offer.purchasableSnapshot?.title ?? "",
          sku: offer.purchasableSnapshot?.sku ?? null,
          price: Money.fromMinor(BigInt(offer.unitPrice)),
          compareAtPrice:
            offer.unitCompareAtPrice != null
              ? Money.fromMinor(BigInt(offer.unitCompareAtPrice))
              : null,
          imageUrl: offer.purchasableSnapshot?.imageUrl ?? null,
          snapshot: offer.purchasableSnapshot?.data ?? null,
        },
      };
    });

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
