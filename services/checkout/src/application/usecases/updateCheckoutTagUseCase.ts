import {
  UseCase,
  type UseCaseDependencies,
} from "@src/application/usecases/useCase";
import type { CheckoutTagUpdateInput } from "@src/application/checkout/types";
import type { CheckoutTagUpdatedDto } from "@src/domain/checkout/dto";

export interface UpdateCheckoutTagUseCaseDependencies
  extends UseCaseDependencies {}

export class UpdateCheckoutTagUseCase extends UseCase<
  CheckoutTagUpdateInput,
  string
> {
  constructor(deps: UpdateCheckoutTagUseCaseDependencies) {
    super(deps);
  }

  async execute(input: CheckoutTagUpdateInput): Promise<string> {
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

    const nextSlug = businessInput.slug ?? currentTag.slug;
    const slugOwner = state.tagsRecord?.[nextSlug];
    if (slugOwner && slugOwner.id !== currentTag.id) {
      throw new Error(`Tag ${nextSlug} already exists`);
    }

    if (
      businessInput.isUnique === true &&
      currentTag.isUnique === false
    ) {
      const linesWithTag = Object.values(state.linesRecord ?? {}).filter(
        (line) => line.tag?.id === currentTag.id
      );
      if (linesWithTag.length > 1) {
        throw new Error(
          `Tag ${currentTag.slug} is assigned to multiple lines and cannot be made unique`
        );
      }
    }

    if (
      businessInput.slug == null &&
      businessInput.isUnique == null
    ) {
      return businessInput.checkoutId;
    }

    const dto: CheckoutTagUpdatedDto = {
      data: {
        tagId: currentTag.id,
        slug: businessInput.slug,
        isUnique: businessInput.isUnique,
      },
      metadata: this.createMetadataDto(businessInput.checkoutId, context),
    };

    await this.checkoutWriteRepository.updateCheckoutTag(dto);

    return businessInput.checkoutId;
  }
}
