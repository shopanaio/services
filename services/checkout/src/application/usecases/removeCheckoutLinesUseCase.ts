import {
  UseCase,
  type UseCaseDependencies,
} from "@src/application/usecases/useCase";
import type { CheckoutLinesDeleteInput } from "@src/application/checkout/types";
import type { DeleteCheckoutLinesCommand } from "@src/domain/checkout/commands";
import { Money } from "@shopana/money";
import { type CheckoutContext } from "@src/context/index.js";
import {
  checkoutDecider,
  CheckoutLineItemState,
} from "@src/domain/checkout/decider";

export interface DeleteCheckoutLinesUseCaseDependencies
  extends UseCaseDependencies {}

export class DeleteCheckoutLinesUseCase extends UseCase<
  CheckoutLinesDeleteInput,
  string
> {
  constructor(deps: DeleteCheckoutLinesUseCaseDependencies) {
    super(deps);
  }

  async execute(input: CheckoutLinesDeleteInput): Promise<string> {
    const { apiKey, project, customer, user, ...businessInput } = input;
    const context = { apiKey, project, customer, user };
    const { state, streamExists, streamVersion, streamId } =
      await this.loadCheckoutState(businessInput.checkoutId);

    this.validateCheckoutExists(streamExists);
    this.validateTenantAccess(state, context);
    this.validateCurrencyCode(state);

    // Validate lines to be deleted
    for (const id of businessInput.lineIds) {
      if (!state.linesRecord?.[id]) {
        throw new Error(`Line ${id} does not exist`);
      }
    }

    // Remaining lines after deletion
    const existingLines = Object.values(state.linesRecord ?? {});
    const remainingLines = existingLines.filter(
      line => !businessInput.lineIds.includes(line.lineId)
    );

    let checkoutLines: CheckoutLineItemState[] = [];
    let computed = {
      checkoutLinesCost: {},
      checkoutCost: {
        subtotal: Money.zero(),
        discountTotal: Money.zero(),
        taxTotal: Money.zero(),
        shippingTotal: Money.zero(),
        grandTotal: Money.zero(),
        totalQuantity: 0,
      }
    };

    // If lines remain - get current data and recalculate
    if (remainingLines.length > 0) {
      const ctx = context;
      const { offers } = await this.checkoutService.getOffers({
        apiKey: ctx.apiKey,
        currency: state.currencyCode,
        projectId: ctx.project.id,
        items: remainingLines.map(l => ({
          lineId: l.lineId,
          purchasableId: l.unit.id,
          quantity: l.quantity,
        })),
      });

      checkoutLines = remainingLines.map(line => {
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

      computed = await this.checkoutService.computeTotals({
        projectId: context.project.id,
        checkoutLines,
        appliedDiscounts: state.appliedDiscounts,
        currency: state.currencyCode,
      });
    }

    const command: DeleteCheckoutLinesCommand = {
      type: "checkout.lines.delete",
      data: {
        checkoutLines,
        checkoutLinesCost: computed.checkoutLinesCost,
        checkoutCost: computed.checkoutCost,
      },
      metadata: this.createCommandMetadata(businessInput.checkoutId, context),
    };

    const events = checkoutDecider.decide(command, state);
    await this.appendToStream(streamId, events, streamVersion!);

    return input.checkoutId;
  }

  // removed: createDeliveryGroups -> moved to base UseCase
}
