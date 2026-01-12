"use client";

import { useState, useEffect, useCallback } from "react";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import {
  EntityMediaGallery,
  type IMediaItem,
} from "@/shared/components/entity-media-gallery";
import type { IEditMediaModalPayload } from "../../modals";
import type { IMediaFile } from "@/mocks/products/types";
import { FileDriver } from "@/mocks/products/types";
import { useStyles } from "./edit-media-modal.styles";

/**
 * Convert IMediaFile to IMediaItem for the gallery component
 */
const toMediaItem = (file: IMediaFile): IMediaItem => ({
  id: file.id,
  url: file.url,
  name: file.name,
  size: file.size,
  ext: file.ext,
});

/**
 * Convert IMediaItem back to IMediaFile
 */
const toMediaFile = (item: IMediaItem): IMediaFile => ({
  id: item.id,
  url: item.url,
  name: item.name,
  size: item.size,
  ext: item.ext || item.name.split(".").pop() || "",
  driver: FileDriver.LOCAL,
  key: item.name,
  createdAt: new Date().toISOString(),
});

export const EditMediaModal = () => {
  const { styles } = useStyles();
  const { payload, pop, setDirty } = useModalStackContext();
  const typedPayload = payload as IEditMediaModalPayload;

  const [gallery, setGallery] = useState<IMediaItem[]>(() => {
    const items = [...typedPayload.gallery].map(toMediaItem);
    if (
      typedPayload.featured &&
      !items.find((i) => i.id === typedPayload.featured?.id)
    ) {
      items.unshift(toMediaItem(typedPayload.featured));
    }
    return items;
  });

  const markDirty = useCallback(() => {
    setDirty(true);
  }, [setDirty]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        pop();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pop]);

  const handleChange = useCallback(
    (items: IMediaItem[]) => {
      setGallery(items);
      markDirty();
    },
    [markDirty]
  );

  const handleSave = useCallback(() => {
    const mediaFiles = gallery.map(toMediaFile);
    const newFeatured = mediaFiles[0] || null;
    typedPayload.onSave?.({ featured: newFeatured, gallery: mediaFiles });
    pop();
  }, [typedPayload, gallery, pop]);

  const handleUpload = useCallback(
    async (files: File[]): Promise<IMediaItem[]> => {
      // If custom upload handler is provided, use it
      if (typedPayload.onUpload) {
        const uploadedMedia = await typedPayload.onUpload(files);
        return uploadedMedia.map(toMediaItem);
      }

      // Default: create local items
      return files.map((file) => ({
        id: `media-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        url: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
        ext: file.name.split(".").pop() || "",
        file,
      }));
    },
    [typedPayload]
  );

  return (
    <ModalLayout
      name="edit-media"
      header={
        <ModalHeader
          name="edit-media"
          title="Edit Media"
          onClose={pop}
          submitButtonProps={{
            children: "Save",
            onClick: handleSave,
          }}
        />
      }
    >
      <div className={styles.container}>
        <EntityMediaGallery
          value={gallery}
          onChange={handleChange}
          onUpload={handleUpload}
          title="Product Media"
          showViewSwitcher
          accept="image/*,video/*"
          multiple
          hasFeatured
          featuredLabel="Featured"
          emptyMessage="No media files yet"
        />
      </div>
    </ModalLayout>
  );
};
