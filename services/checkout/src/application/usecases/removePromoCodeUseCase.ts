import {
  UseCase,
  type UseCaseDependencies,
} from "@src/application/usecases/useCase";
import type { CheckoutPromoCodeRemoveInput } from "@src/application/checkout/types";
import type { RemovePromoCodeCommand } from "@src/domain/checkout/commands";
import { checkoutDecider } from "@src/domain/checkout/decider";

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

    const { state, streamExists, streamVersion, streamId } =
      await this.loadCheckoutState(businessInput.checkoutId);

    this.validateCheckoutExists(streamExists);
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

    const command: RemovePromoCodeCommand = {
      type: "checkout.promo.code.remove",
      data: {
        checkoutLines,
        checkoutLinesCost: computed.checkoutLinesCost,
        checkoutCost: computed.checkoutCost,
        appliedDiscounts: newAppliedDiscounts,
      },
      metadata: this.createCommandMetadata(businessInput.checkoutId, context),
    };

    await this.appendToStream(
      streamId,
      checkoutDecider.decide(command, state),
      streamVersion,
    );

    return businessInput.checkoutId;
  }
}
