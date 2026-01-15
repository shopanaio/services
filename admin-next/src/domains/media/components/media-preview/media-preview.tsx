"use client";

import { useState, useMemo, useCallback } from "react";
import { Image } from "antd";
import ReactPlayer from "react-player";
import type { ApiFile } from "@/graphql/types";
import { FileProvider } from "@/graphql/types";
import styles from "./media-preview.module.css";

interface MediaPreviewProps {
  files: ApiFile[];
  visible: boolean;
  currentIndex: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

const isVideoProvider = (provider?: FileProvider | null): boolean => {
  return provider === FileProvider.Youtube || provider === FileProvider.Vimeo;
};

export function MediaPreview({
  files,
  visible,
  currentIndex,
  onClose,
  onIndexChange,
}: MediaPreviewProps) {
  // Create items for PreviewGroup
  const previewItems = useMemo(
    () =>
      files.map((file) => {
        // For YouTube/Vimeo, generate thumbnail from external ID
        if (isVideoProvider(file.provider) && file.externalData?.externalId) {
          const thumbnailUrl =
            file.provider === FileProvider.Youtube
              ? `https://img.youtube.com/vi/${file.externalData.externalId}/hqdefault.jpg`
              : file.url;
          return { src: thumbnailUrl };
        }
        return { src: file.url };
      }),
    [files]
  );

  // Custom render for preview - show ReactPlayer for videos
  const imageRender = useCallback(
    (
      originalNode: React.ReactElement,
      info: { current: number }
    ): React.ReactNode => {
      const file = files[info.current];
      if (!file) return originalNode;

      if (isVideoProvider(file.provider)) {
        return (
          <div className={styles.videoContainer}>
            <ReactPlayer
              src={file.url}
              width="100%"
              height="100%"
              controls
            />
          </div>
        );
      }

      return originalNode;
    },
    [files]
  );

  // Custom toolbar - hide zoom/rotate for videos
  const actionsRender = useCallback(
    (
      originalNode: React.ReactElement,
      info: { current: number }
    ): React.ReactNode => {
      const file = files[info.current];
      if (isVideoProvider(file?.provider)) {
        return null;
      }
      return originalNode;
    },
    [files]
  );

  if (!visible || files.length === 0) {
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
        movable: !isVideoProvider(files[currentIndex]?.provider),
      }}
    />
  );
}

// Hook for managing media preview state
export function useMediaPreview(files: ApiFile[]) {
  const [visible, setVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const open = useCallback((index: number) => {
    setCurrentIndex(index);
    setVisible(true);
  }, []);

  const close = useCallback(() => {
    setVisible(false);
  }, []);

  const openByFileId = useCallback(
    (fileId: string) => {
      const index = files.findIndex((f) => f.id === fileId);
      if (index >= 0) {
        open(index);
      }
    },
    [files, open]
  );

  return {
    visible,
    currentIndex,
    open,
    close,
    openByFileId,
    setCurrentIndex,
  };
}
