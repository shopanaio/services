import { modalStackRegistry } from "@/layouts/modals";
import { EntityPickerModal } from "./entity-picker-modal";
import { ProductPickerModal } from "./product-picker-modal";
import { CategoryPickerModal } from "./category-picker-modal";
import { MediaPickerModal } from "./media-picker-modal";

// Import entity configs to ensure they are registered
import "./configs/product-picker-config";
import "./configs/category-picker-config";
import "./configs/media-picker-config";

/**
 * Register entity picker modal in the modal stack
 */
modalStackRegistry.register({
  type: "entity-picker",
  component: EntityPickerModal,
});

/**
 * Register product picker modal
 */
modalStackRegistry.register({
  type: "product-picker",
  component: ProductPickerModal,
});

/**
 * Register category picker modal
 */
modalStackRegistry.register({
  type: "category-picker",
  component: CategoryPickerModal,
});

/**
 * Register media picker modal
 */
modalStackRegistry.register({
  type: "media-picker",
  component: MediaPickerModal,
});
