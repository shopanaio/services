"use client";

import "@/shared/components/entity-picker-modal/configs/category-picker-config";
import "@/shared/components/entity-picker-modal/configs/vendor-picker-config";
import { EntityPickerRelationControl } from "./entity-picker-relation-control";
import { relationControlRegistry } from "./registry";

relationControlRegistry.register("category", EntityPickerRelationControl);
relationControlRegistry.register("vendor", EntityPickerRelationControl);
