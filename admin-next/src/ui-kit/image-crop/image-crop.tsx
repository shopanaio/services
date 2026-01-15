"use client";

import { useState, useRef, useCallback } from "react";
import { Typography, Button } from "antd";
import { createStyles } from "antd-style";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

// ============================================================================
// Types
// ============================================================================

export interface ImageCropProps {
  /** Image source (base64 or URL) */
  imageSrc: string;
  /** Aspect ratio for crop (default: 1) */
  aspect?: number;
  /** Container size in pixels (default: 300) */
  containerSize?: number;
  /** Use circular crop selection (default: false) */
  circularCrop?: boolean;
  /** Preview size in pixels (default: 80) */
  previewSize?: number;
  /** Preview border radius (default: "50%" for circular, 8 for square) */
  previewBorderRadius?: number | string;
  /** Show preview section (default: true) */
  showPreview?: boolean;
  /** Show action buttons (default: true) */
  showActions?: boolean;
  /** Called when crop is applied */
  onApply: (croppedImageUrl: string) => void;
  /** Called when crop is cancelled */
  onCancel?: () => void;
  /** Called when crop preview changes */
  onCropChange?: (croppedImageUrl: string | null) => void;
}

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  cropModal: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: token.margin,
    minHeight: 400,
  },
  cropContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: token.marginLG,
  },
  previewSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: token.marginXS,
  },
  previewLabel: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
  cropActions: {
    display: "flex",
    justifyContent: "center",
    gap: token.marginSM,
  },
}));

// ============================================================================
// Helpers
// ============================================================================

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
): Crop {
  const minSide = Math.min(mediaWidth, mediaHeight);
  const cropSize = (minSide / mediaWidth) * 90;
  return centerCrop(
    makeAspectCrop(
      { unit: "%", width: cropSize },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

async function getCroppedImage(
  image: HTMLImageElement,
  crop: PixelCrop
): Promise<string> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("No 2d context");

  // Use getBoundingClientRect to get actual displayed dimensions (accounts for CSS styles)
  const rect = image.getBoundingClientRect();
  const scaleX = image.naturalWidth / rect.width;
  const scaleY = image.naturalHeight / rect.height;

  // Canvas size should be in natural image scale for better quality
  canvas.width = crop.width * scaleX;
  canvas.height = crop.height * scaleY;

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return canvas.toDataURL("image/jpeg", 0.9);
}

// ============================================================================
// Component
// ============================================================================

export const ImageCrop = ({
  imageSrc,
  aspect = 1,
  containerSize = 300,
  circularCrop = false,
  previewSize = 100,
  previewBorderRadius,
  showPreview = true,
  showActions = true,
  onApply,
  onCancel,
  onCropChange,
}: ImageCropProps) => {
  const resolvedBorderRadius =
    previewBorderRadius ?? (circularCrop ? "50%" : 8);
  const { styles } = useStyles();

  const [crop, setCrop] = useState<Crop>();
  const [cropPreview, setCropPreview] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { naturalWidth, naturalHeight } = e.currentTarget;
      setCrop(centerAspectCrop(naturalWidth, naturalHeight, aspect));
    },
    [aspect]
  );

  const handleCropComplete = useCallback(
    async (pixelCrop: PixelCrop) => {
      if (imgRef.current && pixelCrop.width && pixelCrop.height) {
        const croppedUrl = await getCroppedImage(imgRef.current, pixelCrop);
        setCropPreview(croppedUrl);
        onCropChange?.(croppedUrl);
      }
    },
    [onCropChange]
  );

  const handleApply = useCallback(() => {
    if (cropPreview) {
      onApply(cropPreview);
    }
  }, [cropPreview, onApply]);

  return (
    <div className={styles.cropModal}>
      <div className={styles.cropContainer}>
        <ReactCrop
          crop={crop}
          onChange={(c) => setCrop(c)}
          onComplete={handleCropComplete}
          aspect={aspect}
          keepSelection
          circularCrop={circularCrop}
        >
          <img
            ref={imgRef}
            src={imageSrc}
            alt="Crop preview"
            style={{ maxWidth: containerSize, maxHeight: containerSize }}
            onLoad={onImageLoad}
          />
        </ReactCrop>
        {showPreview && cropPreview && (
          <div className={styles.previewSection}>
            <img
              src={cropPreview}
              alt="Cropped preview"
              style={{
                width: previewSize,
                height: previewSize,
                borderRadius: resolvedBorderRadius,
                objectFit: "cover",
                border: "1px solid var(--ant-color-border)",
              }}
            />
          </div>
        )}
      </div>
      {showActions && (
        <div className={styles.cropActions}>
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="primary" onClick={handleApply} disabled={!cropPreview}>
            Apply
          </Button>
        </div>
      )}
    </div>
  );
};
