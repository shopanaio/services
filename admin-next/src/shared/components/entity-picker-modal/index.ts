// Types
export type {
  IPickableEntity,
  IEntityPickerConfig,
  IEntityPickerPayload,
  IEntityPickerPagination,
  IEntityPickerDataResult,
  IStatusConfig,
  StatusMap,
} from "./types";

// Components
export { EntityPickerModal } from "./entity-picker-modal";
export { ProductPickerModal } from "./product-picker-modal";
export type { IProductPickerPayload } from "./product-picker-modal";
export { CategoryPickerModal } from "./category-picker-modal";
export type { ICategoryPickerPayload } from "./category-picker-modal";
export { EntityPickerContent } from "./entity-picker-content";

// Cell Renderers
export { EntityCellRenderer, StatusCellRenderer } from "./cell-renderers";

// Hooks
export {
  useEntityPicker,
  useProductPicker,
  useCategoryPicker,
} from "./hooks/use-entity-picker";

// Config registry
export {
  registerEntityPickerConfig,
  getEntityPickerConfig,
  hasEntityPickerConfig,
  getRegisteredEntityTypes,
} from "./configs";

// Product config (auto-registers)
export { productPickerConfig } from "./configs/product-picker-config";

// Category config (auto-registers)
export { categoryPickerConfig } from "./configs/category-picker-config";
