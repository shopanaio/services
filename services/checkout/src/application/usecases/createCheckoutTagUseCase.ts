import { v7 as uuidv7 } from "uuid";
import {
  UseCase,
  type UseCaseDependencies,
} from "@src/application/usecases/useCase";
import type { CheckoutTagCreateInput } from "@src/application/checkout/types";
import type { CheckoutTagCreatedDto } from "@src/domain/checkout/dto";

export interface CreateCheckoutTagUseCaseDependencies
  extends UseCaseDependencies {}

export class CreateCheckoutTagUseCase extends UseCase<
  CheckoutTagCreateInput,
  string
> {
  constructor(deps: CreateCheckoutTagUseCaseDependencies) {
    super(deps);
  }

  async execute(input: CheckoutTagCreateInput): Promise<string> {
    const { apiKey, project, customer, user, ...businessInput } = input;
    const context = { apiKey, project, customer, user };

    const state = await this.getCheckoutState(businessInput.checkoutId);
    this.assertCheckoutExists(state);
    this.validateTenantAccess(state, context);

    if (state.tagsRecord?.[businessInput.tag.slug]) {
      throw new Error(`Tag ${businessInput.tag.slug} already exists`);
    }

    const tagId = uuidv7();
    const dto: CheckoutTagCreatedDto = {
      data: {
        tag: {
          id: tagId,
          slug: businessInput.tag.slug,
          isUnique: businessInput.tag.isUnique,
        },
      },
      metadata: this.createMetadataDto(businessInput.checkoutId, context),
    };

    await this.checkoutWriteRepository.createCheckoutTag(dto);

    return businessInput.checkoutId;
  }
}
