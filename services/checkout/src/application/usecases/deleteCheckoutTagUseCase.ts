import {
  UseCase,
  type UseCaseDependencies,
} from "@src/application/usecases/useCase";
import type { CheckoutTagDeleteInput } from "@src/application/checkout/types";
import type { CheckoutTagDeletedDto } from "@src/domain/checkout/dto";

export interface DeleteCheckoutTagUseCaseDependencies
  extends UseCaseDependencies {}

export class DeleteCheckoutTagUseCase extends UseCase<
  CheckoutTagDeleteInput,
  string
> {
  constructor(deps: DeleteCheckoutTagUseCaseDependencies) {
    super(deps);
  }

  async execute(input: CheckoutTagDeleteInput): Promise<string> {
    const { apiKey, project, customer, user, ...businessInput } = input;
    const context = { apiKey, project, customer, user };

    const state = await this.getCheckoutState(businessInput.checkoutId);
    this.assertCheckoutExists(state);
    this.validateTenantAccess(state, context);

    const currentTag = Object.values(state.tagsRecord ?? {}).find(
      (tag) => tag.id === businessInput.tagId
    );
    if (!currentTag) {
      throw new Error(`Tag ${businessInput.tagId} does not exist`);
    }

    const dto: CheckoutTagDeletedDto = {
      data: {
        tagId: currentTag.id,
      },
      metadata: this.createMetadataDto(businessInput.checkoutId, context),
    };

    await this.checkoutWriteRepository.deleteCheckoutTag(dto);

    return businessInput.checkoutId;
  }
}
