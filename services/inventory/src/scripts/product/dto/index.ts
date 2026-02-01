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
} from "./ProductUpdateDto.js";

// Product Delete DTOs
export type {
  ProductDeleteParams,
  ProductDeleteResult,
} from "./ProductDeleteDto.js";

// Product Set Status DTOs
export type {
  ProductStatus,
  ProductSetStatusParams,
  ProductSetStatusResult,
} from "./ProductSetStatusDto.js";

// Product Set Content DTOs
export type {
  ProductSetContentParams,
  ProductSetContentResult,
} from "./ProductSetContentDto.js";

// Product Set SEO DTOs
export type {
  ProductSeoInput,
  ProductSetSeoParams,
  ProductSetSeoResult,
} from "./ProductSetSeoDto.js";

// Product Set Media DTOs
export type {
  ProductSetMediaParams,
  ProductSetMediaResult,
} from "./ProductSetMediaDto.js";
