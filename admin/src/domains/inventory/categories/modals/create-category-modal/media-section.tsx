"use client";

import { useFormContext } from "react-hook-form";
import { EntityMediaGallery } from "@/domains/media/components";
import type { ApiFile } from "@/graphql/types";
import type { ICreateCategoryFormValues } from "./types";

export const MediaSection = () => {
  const { watch, setValue } = useFormContext<ICreateCategoryFormValues>();

  const media = watch("media");

  const handleChange = (items: ApiFile[]) => {
    setValue("media", items);
  };

  return (
    <EntityMediaGallery
      value={media}
      onChange={handleChange}
      title="Media"
      showViewSwitcher
      accept="image/*"
      hasFeatured
    />
  );
};
