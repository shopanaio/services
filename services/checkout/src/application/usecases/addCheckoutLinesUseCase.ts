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

    // Aggregate duplicates by productId and sum quantity
    const addedLines: {
      lineId: string;
      quantity: number;
      purchasableId: string;
    }[] = [];

    businessInput.lines.forEach((line) => {
      // Find existing line by purchasableId
      const existingLine = addedLines.find(
        (l) => l.purchasableId === line.purchasableId
      );

      if (existingLine) {
        // If existing line exists, sum the quantity
        existingLine.quantity += line.quantity;
      } else {
        addedLines.push({ lineId: uuidv7(), ...line });
      }
    });

    // Get product information from inventory
    const ctx = context;
    const { offers } = await this.checkoutService.getOffers({
      apiKey: ctx.apiKey,
      currency: state.currencyCode,
      projectId: ctx.project.id,
      items: [
        ...addedLines,
        ...existingLines.map((l) => ({
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

    const checkoutLines = [...existingLines, ...newLines];
    const computed = await this.checkoutService.computeTotals({
      projectId: context.project.id,
      checkoutLines,
      appliedDiscounts: state.appliedDiscounts,
      currency: state.currencyCode,
    });

    const dto: CheckoutLinesAddedDto = {
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
