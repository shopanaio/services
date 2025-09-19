import {
  UseCase,
  type UseCaseDependencies,
} from "@src/application/usecases/useCase";
import type { CheckoutPromoCodeAddInput } from "@src/application/checkout/types";
import type { AddPromoCodeCommand } from "@src/domain/checkout/commands";
import { checkoutDecider } from "@src/domain/checkout/decider";
import { AppliedDiscountSnapshot } from "@src/domain/checkout/discount";

export interface AddPromoCodeUseCaseDependencies extends UseCaseDependencies {}

export class AddPromoCodeUseCase extends UseCase<
  CheckoutPromoCodeAddInput,
  string
> {
  constructor(deps: AddPromoCodeUseCaseDependencies) {
    super(deps);
  }

  async execute(input: CheckoutPromoCodeAddInput): Promise<string> {
    const { apiKey, project, customer, user, ...businessInput } = input;
    const context = { apiKey, project, customer, user };

    const { state, streamExists, streamVersion, streamId } =
      await this.loadCheckoutState(businessInput.checkoutId);

    this.validateCheckoutExists(streamExists);
    this.validateTenantAccess(state, context);
    this.validateCurrencyCode(state);

    if (state.appliedDiscounts?.some((d) => d.code === businessInput.code)) {
      // Idempotency: promo code already applied
      return businessInput.checkoutId;
    }

    // Validate promo code through pricing service
    const promo = await this.pricingApi.validateDiscount({
      code: businessInput.code,
      projectId: context.project.id,
    });

    if (!promo.valid) {
      throw new Error(`Invalid promo code: ${businessInput.code}`);
    }

    if (!promo.discount) {
      throw new Error(
        `No discount data received for promo code: ${promo.code}`,
      );
    }

    const newAppliedDiscounts: AppliedDiscountSnapshot[] = [
      ...(state.appliedDiscounts ?? []),
      {
        code: businessInput.code,
        appliedAt: new Date(),
        type: promo.discount.type,
        value: promo.discount.value,
        provider: promo.discount.provider,
      },
    ];

    const checkoutLines = Object.values(state.linesRecord ?? {});
    const computed = await this.checkoutService.computeTotals({
      projectId: context.project.id,
      checkoutLines,
      appliedDiscounts: newAppliedDiscounts,
      currency: state.currencyCode,
    });

    const command: AddPromoCodeCommand = {
      type: "checkout.promo.code.add",
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
