"use client";

import { useState, useMemo, useCallback } from "react";
import { Image } from "antd";
import ReactPlayer from "react-player";
import { FileProvider } from "@/graphql/types";
import styles from "./media-preview.module.css";

// Generic interface for preview items
export interface IPreviewItem {
  id: string;
  url: string;
  provider?: FileProvider | null;
  externalData?: {
    externalId?: string | null;
  } | null;
}

interface MediaPreviewProps<T extends IPreviewItem> {
  items: T[];
  visible: boolean;
  currentIndex: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

const isVideoProvider = (provider?: FileProvider | null): boolean => {
  return provider === FileProvider.Youtube || provider === FileProvider.Vimeo;
};

export function MediaPreview<T extends IPreviewItem>({
  items,
  visible,
  currentIndex,
  onClose,
  onIndexChange,
}: MediaPreviewProps<T>) {
  // Create items for PreviewGroup
  const previewItems = useMemo(
    () =>
      items.map((item) => {
        // For YouTube/Vimeo, generate thumbnail from external ID
        if (isVideoProvider(item.provider) && item.externalData?.externalId) {
          const thumbnailUrl =
            item.provider === FileProvider.Youtube
              ? `https://img.youtube.com/vi/${item.externalData.externalId}/hqdefault.jpg`
              : item.url;
          return { src: thumbnailUrl };
        }
        return { src: item.url };
      }),
    [items]
  );

  // Custom render for preview - show ReactPlayer for videos
  const imageRender = useCallback(
    (
      originalNode: React.ReactElement,
      info: { current: number }
    ): React.ReactNode => {
      const item = items[info.current];
      if (!item) return originalNode;

      if (isVideoProvider(item.provider)) {
        return (
          <div className={styles.videoContainer}>
            <ReactPlayer
              src={item.url}
              width="100%"
              height="100%"
              controls
            />
          </div>
        );
      }

      return originalNode;
    },
    [items]
  );

  // Custom toolbar - hide zoom/rotate for videos
  const actionsRender = useCallback(
    (
      originalNode: React.ReactElement,
      info: { current: number }
    ): React.ReactNode => {
      const item = items[info.current];
      if (isVideoProvider(item?.provider)) {
        return null;
      }
      return originalNode;
    },
    [items]
  );

  if (!visible || items.length === 0) {
    return null;
  }

  return (
    <Image.PreviewGroup
      items={previewItems}
      preview={{
        open: visible,
        current: currentIndex,
        onOpenChange: (open) => {
          if (!open) onClose();
        },
        onChange: (current) => {
          onIndexChange(current);
        },
        imageRender,
        actionsRender,
        movable: !isVideoProvider(items[currentIndex]?.provider),
      }}
    />
  );
}

// Hook for managing media preview state
export function useMediaPreview<T extends IPreviewItem>(items: T[]) {
  const [visible, setVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const open = useCallback((index: number) => {
    setCurrentIndex(index);
    setVisible(true);
  }, []);

  const close = useCallback(() => {
    setVisible(false);
  }, []);

  const openById = useCallback(
    (id: string) => {
      const index = items.findIndex((item) => item.id === id);
      if (index >= 0) {
        open(index);
      }
    },
    [items, open]
  );

  return {
    visible,
    currentIndex,
    open,
    close,
    openById,
    setCurrentIndex,
  };
}
