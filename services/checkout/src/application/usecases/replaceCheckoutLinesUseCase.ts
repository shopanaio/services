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
   * Applies replacements by transforming the source line (by lineId) into the
   * target purchasable (by purchasableId) with the requested quantity. No new
   * lines are created. If a different line with the target purchasable already
   * exists, it is removed to ensure a single resulting line. If quantity is
   * omitted, the full quantity from the source is used. Any remaining quantity
   * on the source is not preserved.
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
      const { lineId, purchasableId } = op;

      const fromLine = linesMap.get(lineId);
      if (!fromLine) throw new Error(`Line ${lineId} does not exist`);

      const moveQty = op.quantity ?? fromLine.quantity;
      if (moveQty <= 0) throw new Error("quantity must be > 0");
      if (moveQty > fromLine.quantity) {
        throw new Error(
          `quantity to move (${moveQty}) exceeds source line quantity (${fromLine.quantity})`
        );
      }

      // If target purchasable is the same as the source, this op is a no-op
      if (fromLine.unit.id === purchasableId) {
        continue;
      }

      // If target purchasable is the same as the source, adjust quantity if provided
      if (fromLine.unit.id === purchasableId) {
        // If no quantity specified, nothing to change
        if (op.quantity == null) {
          continue;
        }

        linesMap.set(lineId, { ...fromLine, quantity: moveQty });
        continue;
      }

      // Remove any other existing line with the target purchasable to avoid duplicates
      const existingTarget = Array.from(linesMap.values()).find(
        (l) => l.unit.id === purchasableId && l.lineId !== fromLine.lineId
      );
      if (existingTarget) {
        linesMap.delete(existingTarget.lineId);
      }

      // Transform the source line into the target purchasable with the requested quantity
      linesMap.set(lineId, {
        ...fromLine,
        quantity: moveQty,
        unit: {
          ...fromLine.unit,
          id: purchasableId,
          // The rest of unit fields will be refreshed from offers below
          title: "",
          sku: null,
          price: Money.fromMinor(0n),
          compareAtPrice: null,
          imageUrl: null,
          snapshot: null,
        },
      });
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
        checkoutLines: this.mapLinesToDtoLines(checkoutLines),
        checkoutLinesCost: computed.checkoutLinesCost,
        checkoutCost: computed.checkoutCost,
      },
      metadata: this.createMetadataDto(businessInput.checkoutId, context),
    };

    await this.checkoutWriteRepository.applyCheckoutLines(dto);

    return input.checkoutId;
  }
}
