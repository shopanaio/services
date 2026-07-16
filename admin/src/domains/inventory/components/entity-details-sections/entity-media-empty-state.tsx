"use client";

import { LuImage as PictureOutlined } from "react-icons/lu";
import { EntityDetailsEmptyState } from "./entity-details-empty-state";

export const EntityMediaEmptyState = () => (
  <EntityDetailsEmptyState
    icon={<PictureOutlined />}
    state={{
      title: "No media added",
      description: "Add product images to show visuals in storefronts and product previews.",
    }}
  />
);
