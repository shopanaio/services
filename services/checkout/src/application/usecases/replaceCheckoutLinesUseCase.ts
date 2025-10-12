import {
  UseCase,
  type UseCaseDependencies,
} from "@src/application/usecases/useCase";
import type { CheckoutLinesReplaceInput } from "@src/application/checkout/types";
import type { CheckoutLinesUpdatedDto } from "@src/domain/checkout/dto";
import { Money } from "@shopana/shared-money";
import { CheckoutLineItemState } from "@src/domain/checkout/types";

export interface ReplaceCheckoutLinesUseCaseDependencies
  extends UseCaseDependencies {}

/**
 * Applies multiple replacements: moves quantity from lineIdFrom to lineIdTo for each operation.
 * If quantity is omitted, moves full quantity from source line. Removes source line if quantity becomes 0.
 */
export class ReplaceCheckoutLinesUseCase extends UseCase<
  CheckoutLinesReplaceInput,
  string
> {
  constructor(deps: ReplaceCheckoutLinesUseCaseDependencies) {
    super(deps);
  }

  async execute(input: CheckoutLinesReplaceInput): Promise<string> {
    const { apiKey, project, customer, user, ...businessInput } = input;
    const context = { apiKey, project, customer, user };
    const ctx = context;
    const state = await this.getCheckoutState(businessInput.checkoutId);

    this.assertCheckoutExists(state);
    this.validateTenantAccess(state, context);
    this.validateCurrencyCode(state);

    // Work on a mutable copy of lines map
    const linesMap: Map<string, CheckoutLineItemState> = new Map(
      Object.values(state.linesRecord ?? {}).map((l) => [l.lineId, { ...l }])
    );

    for (const op of businessInput.lines) {
      const { lineIdFrom, lineIdTo } = op;
      if (lineIdFrom === lineIdTo) {
        throw new Error("lineIdFrom must differ from lineIdTo");
      }

      const fromLine = linesMap.get(lineIdFrom);
      const toLine = linesMap.get(lineIdTo);
      if (!fromLine) throw new Error(`Line ${lineIdFrom} does not exist`);
      if (!toLine) throw new Error(`Line ${lineIdTo} does not exist`);

      const moveQty = op.quantity ?? fromLine.quantity;
      if (moveQty <= 0) throw new Error("quantity must be > 0");
      if (moveQty > fromLine.quantity) {
        throw new Error(
          `quantity to move (${moveQty}) exceeds source line quantity (${fromLine.quantity})`
        );
      }

      // Apply mutation
      const newFromQty = fromLine.quantity - moveQty;
      const newToQty = toLine.quantity + moveQty;

      if (newFromQty === 0) {
        linesMap.delete(lineIdFrom);
      } else {
        linesMap.set(lineIdFrom, { ...fromLine, quantity: newFromQty });
      }

      linesMap.set(lineIdTo, { ...toLine, quantity: newToQty });
    }

    const mergedLines: CheckoutLineItemState[] = Array.from(linesMap.values());

    // Fetch fresh offer data for merged lines
    const { offers } = await this.checkoutService.getOffers({
      apiKey: ctx.apiKey,
      currency: state.currencyCode,
      projectId: ctx.project.id,
      items: mergedLines.map((l) => ({
        lineId: l.lineId,
        purchasableId: l.unit.id,
        quantity: l.quantity,
      })),
    });

    const checkoutLines: CheckoutLineItemState[] = mergedLines.map((line) => {
      const offer = offers.get(line.unit.id);
      if (!offer?.isAvailable) {
        throw new Error(`Product not found in inventory`);
      }

      return {
        ...line,
        unit: {
          ...line.unit,
          price: Money.fromMinor(BigInt(offer.unitPrice)),
          compareAtPrice:
            offer.unitCompareAtPrice != null
              ? Money.fromMinor(BigInt(offer.unitCompareAtPrice))
              : null,
          title: offer.purchasableSnapshot?.title ?? line.unit.title,
          sku: offer.purchasableSnapshot?.sku ?? line.unit.sku,
          imageUrl: offer.purchasableSnapshot?.imageUrl ?? line.unit.imageUrl,
          snapshot: offer.purchasableSnapshot?.data ?? line.unit.snapshot,
        },
      };
    });

    const computed = await this.checkoutService.computeTotals({
      projectId: context.project.id,
      checkoutLines,
      appliedDiscounts: state.appliedDiscounts,
      currency: state.currencyCode,
    });

    const dto: CheckoutLinesUpdatedDto = {
      data: {
        checkoutLines,
        checkoutLinesCost: computed.checkoutLinesCost,
        checkoutCost: computed.checkoutCost,
      },
      metadata: this.createMetadataDto(businessInput.checkoutId, context),
    };

    await this.checkoutWriteRepository.applyCheckoutLines(dto);

    return input.checkoutId;
  }
}
