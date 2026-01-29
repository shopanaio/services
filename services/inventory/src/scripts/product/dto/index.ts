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
  ProductCreateOptionInput,
  ProductCreateOptionValueInput,
  ProductCreateVariantInput,
  VariantMediaEntry,
} from "./ProductCreateDto.js";

// Product Update DTOs
export type {
  ProductUpdateParams,
  ProductUpdateResult,
  ProductSeoInput,
} from "./ProductUpdateDto.js";

// Product Delete DTOs
export type {
  ProductDeleteParams,
  ProductDeleteResult,
} from "./ProductDeleteDto.js";

// Product Set Status DTOs
export type {
  ProductStatusAction,
  ProductSetStatusParams,
  ProductSetStatusResult,
} from "./ProductSetStatusDto.js";
