"use client";

import { useState, useMemo, useCallback } from "react";
import { Image, Modal } from "antd";
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
  return (
    provider === FileProvider.Youtube || provider === FileProvider.Vimeo
  );
};

const isImageFile = (file: ApiFile): boolean => {
  return (
    file.mimeType?.startsWith("image/") ||
    (!isVideoProvider(file.provider) && !file.mimeType?.startsWith("video/"))
  );
};

export function MediaPreview({
  files,
  visible,
  currentIndex,
  onClose,
  onIndexChange,
}: MediaPreviewProps) {
  const currentFile = files[currentIndex];

  // Separate images for the Image.PreviewGroup
  const imageFiles = useMemo(
    () => files.filter((f) => isImageFile(f)),
    [files]
  );

  const imageUrls = useMemo(
    () => imageFiles.map((f) => f.url),
    [imageFiles]
  );

  // Find the image index within imageFiles array
  const currentImageIndex = useMemo(() => {
    if (!currentFile || !isImageFile(currentFile)) return -1;
    return imageFiles.findIndex((f) => f.id === currentFile.id);
  }, [currentFile, imageFiles]);

  const isCurrentVideo = currentFile && isVideoProvider(currentFile.provider);

  // Handle navigation for videos
  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      onIndexChange(currentIndex - 1);
    }
  }, [currentIndex, onIndexChange]);

  const handleNext = useCallback(() => {
    if (currentIndex < files.length - 1) {
      onIndexChange(currentIndex + 1);
    }
  }, [currentIndex, files.length, onIndexChange]);

  // Video modal for YouTube/Vimeo
  if (isCurrentVideo && visible) {
    return (
      <Modal
        open={visible}
        onCancel={onClose}
        footer={null}
        width={900}
        centered
        destroyOnClose
        className={styles.videoModal}
        styles={{
          body: { padding: 0, backgroundColor: "#000" },
        }}
      >
        <div className={styles.videoContainer}>
          <ReactPlayer
            src={currentFile.url}
            width="100%"
            height="100%"
            controls
            playing
          />
        </div>
        {files.length > 1 && (
          <div className={styles.videoNavigation}>
            <button
              className={styles.navButton}
              onClick={handlePrev}
              disabled={currentIndex === 0}
            >
              ←
            </button>
            <span className={styles.navCounter}>
              {currentIndex + 1} / {files.length}
            </span>
            <button
              className={styles.navButton}
              onClick={handleNext}
              disabled={currentIndex === files.length - 1}
            >
              →
            </button>
          </div>
        )}
      </Modal>
    );
  }

  // Image preview group for images
  if (visible && currentImageIndex >= 0) {
    return (
      <Image.PreviewGroup
        preview={{
          visible: true,
          current: currentImageIndex,
          onVisibleChange: (vis) => {
            if (!vis) onClose();
          },
          onChange: (current) => {
            // Find the actual file index from image index
            const imageFile = imageFiles[current];
            const fileIndex = files.findIndex((f) => f.id === imageFile.id);
            if (fileIndex >= 0) {
              onIndexChange(fileIndex);
            }
          },
        }}
        items={imageUrls}
      />
    );
  }

  return null;
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
