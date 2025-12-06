// Shared types
export type {
  DescriptionInput,
  ProductWithVariants,
  ProductResultBase,
} from "./shared.js";

// Product Create DTOs
export type {
  ProductCreateParams,
  ProductCreateResult,
} from "./ProductCreateDto.js";

// Product Update DTOs
export type {
  FeatureInput as FeatureCreateInput,
  FeatureUpdateInput,
  FeaturesInput,
  OptionInput as OptionCreateInput,
  OptionUpdateInput,
  OptionsInput,
  ProductUpdateParams,
  ProductUpdateResult,
} from "./ProductUpdateDto.js";

// Product Delete DTOs
export type {
  ProductDeleteParams,
  ProductDeleteResult,
} from "./ProductDeleteDto.js";

// Product Publish DTOs
export type {
  ProductPublishParams,
  ProductPublishResult,
} from "./ProductPublishDto.js";

// Product Unpublish DTOs
export type {
  ProductUnpublishParams,
  ProductUnpublishResult,
} from "./ProductUnpublishDto.js";
