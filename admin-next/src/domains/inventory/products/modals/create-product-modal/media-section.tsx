"use client";

import { useCallback } from "react";
import { useFormContext } from "react-hook-form";
import {
  EntityMediaGallery,
  type IMediaItem,
} from "@/shared/components/entity-media-gallery";
import { syntheticId } from "@/utils/synthetic-id";
import type { ICreateProductFormValues, ILocalMediaItem } from "./types";

/**
 * Convert ILocalMediaItem to IMediaItem for the gallery component
 */
const toMediaItem = (item: ILocalMediaItem): IMediaItem => ({
  id: item.id,
  url: item.url,
  name: item.name,
  size: item.size,
  file: item.file,
});

/**
 * Convert IMediaItem back to ILocalMediaItem for the form
 */
const toLocalMediaItem = (
  item: IMediaItem,
  index: number
): ILocalMediaItem => ({
  id: item.id,
  url: item.url,
  name: item.name,
  size: item.size,
  file: item.file!,
  isFeatured: index === 0,
});

export const MediaSection = () => {
  const { watch, setValue } = useFormContext<ICreateProductFormValues>();

  const media = watch("media");
  const galleryItems = media.map(toMediaItem);

  const handleChange = useCallback(
    (items: IMediaItem[]) => {
      setValue("media", items.map(toLocalMediaItem));
    },
    [setValue]
  );

  const handleUpload = useCallback((files: File[]): IMediaItem[] => {
    return files.map((file) => ({
      id: syntheticId(),
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
    }));
  }, []);

  return (
    <EntityMediaGallery
      value={galleryItems}
      onChange={handleChange}
      onUpload={handleUpload}
      showPaper
      title="Media"
      showViewSwitcher
      accept="image/*"
      multiple
      hasFeatured
      featuredLabel="Featured"
    />
  );
};
