"use client";

import { useState, useCallback } from "react";
import { Modal } from "antd";
import { ImageCrop, type ImageCropProps } from "./image-crop";

// ============================================================================
// Types
// ============================================================================

export interface ImageCropModalProps
  extends Omit<
    ImageCropProps,
    "onCancel" | "onApply" | "showActions" | "onCropChange"
  > {
  /** Whether the modal is visible */
  open: boolean;
  /** Modal title (default: "Crop Image") */
  title?: string;
  /** Called when crop is applied */
  onApply: (croppedImageUrl: string) => void;
  /** Called when modal is closed */
  onClose: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const ImageCropModal = ({
  open,
  title = "Crop Image",
  onClose,
  onApply,
  ...cropProps
}: ImageCropModalProps) => {
  const [croppedUrl, setCroppedUrl] = useState<string | null>(null);

  const handleCropChange = useCallback((url: string | null) => {
    setCroppedUrl(url);
  }, []);

  const handleOk = useCallback(() => {
    if (croppedUrl) {
      onApply(croppedUrl);
      onClose();
    }
  }, [croppedUrl, onApply, onClose]);

  return (
    <Modal
      open={open}
      title={title}
      onCancel={onClose}
      onOk={handleOk}
      okText="Apply"
      okButtonProps={{ disabled: !croppedUrl, size: "small" }}
      cancelButtonProps={{ size: "small" }}
      destroyOnHidden
      width={800}
      transitionName=""
      maskTransitionName=""
    >
      <ImageCrop
        {...cropProps}
        showActions={false}
        onApply={handleOk}
        onCropChange={handleCropChange}
      />
    </Modal>
  );
};
