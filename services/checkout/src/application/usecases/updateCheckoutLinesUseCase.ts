import {
  UseCase,
  type UseCaseDependencies,
} from "@src/application/usecases/useCase";
import type { CheckoutLinesUpdateInput } from "@src/application/checkout/types";
import type { CheckoutLinesUpdatedDto } from "@src/domain/checkout/dto";
import { Money } from "@shopana/shared-money";
import { CheckoutLineItemState } from "@src/domain/checkout/types";

export interface UpdateCheckoutLinesUseCaseDependencies
  extends UseCaseDependencies {}

export class UpdateCheckoutLinesUseCase extends UseCase<
  CheckoutLinesUpdateInput,
  string
> {
  constructor(deps: UpdateCheckoutLinesUseCaseDependencies) {
    super(deps);
  }

  async execute(input: CheckoutLinesUpdateInput): Promise<string> {
    const { apiKey, project, customer, user, ...businessInput } = input;
    const context = { apiKey, project, customer, user };
    const ctx = context;
    const state = await this.getCheckoutState(businessInput.checkoutId);

    this.assertCheckoutExists(state);
    this.validateTenantAccess(state, context);
    this.validateCurrencyCode(state);

    // Updated lines without duplicates
    const normalized: Record<string, number> = {};
    for (const u of businessInput.lines) {
      const line = state.linesRecord?.[u.lineId];
      if (!line) {
        throw new Error(`Line ${u.lineId} does not exist`);
      }
      // Block direct updates of child lines
      if (line.parentLineId) {
        throw new Error(
          `Cannot update child line ${u.lineId} directly. Update the parent line instead.`
        );
      }
      normalized[u.lineId] = u.quantity;
    }

    // Determine removed lines (quantity = 0)
    const removedLineIds = new Set<string>();
    for (const [lineId, quantity] of Object.entries(normalized)) {
      if (quantity === 0) {
        removedLineIds.add(lineId);
      }
    }

    // Cascade delete: if a parent is removed, also remove its children
    const existingLines = Object.values(state.linesRecord ?? {});
    for (const line of existingLines) {
      if (line.parentLineId && removedLineIds.has(line.parentLineId)) {
        removedLineIds.add(line.lineId);
      }
    }

    // Create updated lines (excluding removed ones)
    const updatedLines: CheckoutLineItemState[] = existingLines
      .filter((line) => !removedLineIds.has(line.lineId))
      .map((line) => {
        const newQuantity = normalized[line.lineId];
        return newQuantity !== undefined
          ? { ...line, quantity: newQuantity }
          : line;
      });

    // Get current product information
    const { offers } = await this.checkoutService.getOffers({
      apiKey: ctx.apiKey,
      currency: state.currencyCode,
      projectId: ctx.project.id,
      items: updatedLines.map((l) => ({
        lineId: l.lineId,
        purchasableId: l.unit.id,
        quantity: l.quantity,
      })),
    });

    // Update lines with current product data
    const checkoutLines: CheckoutLineItemState[] = updatedLines.map((line) => {
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

    // Recalculate totals
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
