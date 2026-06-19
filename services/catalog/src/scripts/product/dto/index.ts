// Shared types
export type {
  RichTextInput,
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
  InventoryItemCreateInput,
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

// Product Update Status DTOs
export type {
  ProductStatus,
  ProductUpdateStatusParams,
  ProductUpdateStatusResult,
} from "./ProductUpdateStatusDto.js";

// Product Update Content DTOs
export type {
  ProductUpdateContentParams,
  ProductUpdateContentResult,
} from "./ProductUpdateContentDto.js";

// Product Update SEO DTOs
export type {
  ProductSeoInput,
  ProductUpdateSeoParams,
  ProductUpdateSeoResult,
} from "./ProductUpdateSeoDto.js";

// Product Update Media DTOs
export type {
  ProductUpdateMediaParams,
  ProductUpdateMediaResult,
} from "./ProductUpdateMediaDto.js";
