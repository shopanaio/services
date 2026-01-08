"use client";

import { useCallback } from "react";
import { useFormContext } from "react-hook-form";
import { Upload, Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import {
  EntityMediaGallery,
  type IMediaItem,
} from "@/shared/components/entity-media-gallery";
import { syntheticId } from "@/utils/synthetic-id";
import { Paper } from "../../components/Paper";
import { PaperHeader } from "../../components/PaperHeader";
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
const toLocalMediaItem = (item: IMediaItem, index: number): ILocalMediaItem => ({
  id: item.id,
  url: item.url,
  name: item.name,
  size: item.size,
  file: item.file!,
  isCover: index === 0,
});

export const MediaSection = () => {
  const { watch, setValue } = useFormContext<ICreateProductFormValues>();

  const media = watch("media");
  const galleryItems = media.map(toMediaItem);

  const handleChange = useCallback(
    (items: IMediaItem[]) => {
      setValue(
        "media",
        items.map(toLocalMediaItem)
      );
    },
    [setValue]
  );

  const handleUpload = useCallback(
    (files: File[]): IMediaItem[] => {
      return files.map((file) => ({
        id: syntheticId(),
        file,
        url: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
      }));
    },
    []
  );

  const hasMedia = media.length > 0;

  return (
    <Paper>
      <PaperHeader
        title="Media"
        actions={
          hasMedia && (
            <Upload
              accept="image/*"
              multiple
              showUploadList={false}
              beforeUpload={(file) => {
                const newItems = handleUpload([file]);
                handleChange([...galleryItems, ...newItems]);
                return false;
              }}
            >
              <Button size="small" icon={<PlusOutlined />}>
                Upload
              </Button>
            </Upload>
          )
        }
      />

      <EntityMediaGallery
        value={galleryItems}
        onChange={handleChange}
        onUpload={handleUpload}
        accept="image/*"
        multiple
        hasCover
        coverLabel="Cover"
      />
    </Paper>
  );
};
