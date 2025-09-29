import {
  UseCase,
  type UseCaseDependencies,
} from "@src/application/usecases/useCase";
import type { CheckoutPromoCodeRemoveInput } from "@src/application/checkout/types";
import type { CheckoutPromoCodeRemovedDto } from "@src/domain/checkout/events";

export interface RemovePromoCodeUseCaseDependencies
  extends UseCaseDependencies {}

export class RemovePromoCodeUseCase extends UseCase<
  CheckoutPromoCodeRemoveInput,
  string
> {
  constructor(deps: RemovePromoCodeUseCaseDependencies) {
    super(deps);
  }

  async execute(input: CheckoutPromoCodeRemoveInput): Promise<string> {
    const { apiKey, project, customer, user, ...businessInput } = input;
    const context = { apiKey, project, customer, user };

    const state = await this.getCheckoutState(businessInput.checkoutId);

    this.assertCheckoutExists(state);
    this.validateTenantAccess(state, context);

    if (!state.appliedDiscounts?.some((disc) => disc.code === businessInput.code)) {
      // Idempotency: promo code not applied, so nothing to remove
      return businessInput.checkoutId;
    }

    const newAppliedDiscounts = (state.appliedDiscounts ?? []).filter(
      (disc) => disc.code !== businessInput.code,
    );

    const checkoutLines = Object.values(state.linesRecord ?? {});
    const computed = await this.checkoutService.computeTotals({
      projectId: context.project.id,
      checkoutLines,
      appliedDiscounts: newAppliedDiscounts,
      currency: state.currencyCode,
    });

    const event: CheckoutPromoCodeRemovedDto = {
      type: "checkout.promo.code.removed",
      data: {
        checkoutLines,
        checkoutLinesCost: computed.checkoutLinesCost,
        checkoutCost: computed.checkoutCost,
        appliedDiscounts: newAppliedDiscounts,
      },
      metadata: this.createMetadataDto(businessInput.checkoutId, context),
    };

    await this.checkoutWriteRepository.applyPromoCodeRemoved(event);

    return businessInput.checkoutId;
  }
}
