import {
  UseCase,
  type UseCaseDependencies,
} from "@src/application/usecases/useCase";
import type { CheckoutLinesReplaceInput } from "@src/application/checkout/types";
import type { CheckoutLinesUpdatedDto } from "@src/domain/checkout/dto";
import { Money } from "@shopana/shared-money";
import { CheckoutLineItemState } from "@src/domain/checkout/types";
import { v7 as uuidv7 } from "uuid";

export interface ReplaceCheckoutLinesUseCaseDependencies
  extends UseCaseDependencies {}

  /**
   * Applies multiple replacements: moves quantity from a source line (by lineId)
   * to a target purchasable (by purchasableId). If a line with the target
   * purchasable already exists, its quantity is increased; otherwise a new line
   * is created. If quantity is omitted, moves full quantity from the source
   * line. Removes the source line if its quantity becomes 0.
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

      // Decrease quantity on source line or remove it if zero
      const newFromQty = fromLine.quantity - moveQty;
      if (newFromQty === 0) {
        linesMap.delete(lineId);
      } else {
        linesMap.set(lineId, { ...fromLine, quantity: newFromQty });
      }

      // Find an existing line with the target purchasable
      const existingTarget = Array.from(linesMap.values()).find(
        (l) => l.unit.id === purchasableId
      );

      if (existingTarget) {
        // Increase quantity on existing target line
        linesMap.set(existingTarget.lineId, {
          ...existingTarget,
          quantity: existingTarget.quantity + moveQty,
        });
      } else {
        // Create a new line for the target purchasable
        const newLine: CheckoutLineItemState = {
          lineId: uuidv7(),
          quantity: moveQty,
          unit: {
            id: purchasableId,
            // The rest of unit fields will be refreshed from offers below
            title: "",
            sku: null,
            price: Money.fromMinor(0n),
            compareAtPrice: null,
            imageUrl: null,
            snapshot: null,
          },
        };
        linesMap.set(newLine.lineId, newLine);
      }
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
