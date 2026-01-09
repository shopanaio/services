import { modalStackRegistry } from "@/layouts/modals";
import { EntityPickerModal } from "./entity-picker-modal";

/**
 * Register entity picker modal in the modal stack
 */
modalStackRegistry.register({
  type: "entity-picker",
  component: EntityPickerModal,
});
