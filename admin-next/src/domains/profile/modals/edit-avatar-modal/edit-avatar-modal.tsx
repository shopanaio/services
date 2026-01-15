"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, Typography, Button, App } from "antd";
import { UploadOutlined, UserOutlined } from "@ant-design/icons";
import { createStyles } from "antd-style";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import type { IEditAvatarModalPayload } from "../../modals";

const useStyles = createStyles(({ token }) => ({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: token.marginLG,
  },
  uploadArea: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: token.marginMD,
    padding: token.paddingLG,
    border: `1px dashed ${token.colorBorder}`,
    borderRadius: token.borderRadius,
    background: token.colorBgLayout,
  },
  previewContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: token.marginLG,
  },
  cropContainer: {
    width: 400,
    height: 400,
    overflow: "hidden",
  },
  cropImage: {
    width: "auto !important",
    height: "400px !important",
    maxWidth: "none !important",
  },
  previewSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: token.marginSM,
  },
  previewLabel: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
  previewAvatar: {
    width: 100,
    height: 100,
    borderRadius: "50%",
    objectFit: "cover",
    border: `2px solid ${token.colorBorder}`,
  },
  previewPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: "50%",
    border: `2px solid ${token.colorBorder}`,
    background: token.colorBgLayout,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: token.colorTextSecondary,
    fontSize: 32,
  },
  actions: {
    display: "flex",
    justifyContent: "center",
    gap: token.marginSM,
  },
  hint: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
    textAlign: "center" as const,
    marginTop: token.marginSM,
  },
}));

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
): Crop {
  const minSide = Math.min(mediaWidth, mediaHeight);
  const cropSize = (minSide / mediaWidth) * 90;
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: cropSize,
      },
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

  if (!ctx) {
    throw new Error("No 2d context");
  }

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  canvas.width = crop.width;
  canvas.height = crop.height;

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    crop.width,
    crop.height
  );

  return canvas.toDataURL("image/jpeg", 0.9);
}

export const EditAvatarModal = () => {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as IEditAvatarModalPayload;

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    typedPayload.currentImage || null
  );
  const [imgStyle, setImgStyle] = useState<React.CSSProperties>({});
  const imgRef = useRef<HTMLImageElement>(null);

  const handleFileSelect = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImageSrc(reader.result as string);
        setPreviewUrl(null);
      });
      reader.readAsDataURL(file);
      return false;
    },
    []
  );

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { naturalWidth, naturalHeight, width, height } = e.currentTarget;
      const isLandscape = naturalWidth > naturalHeight;
      const containerSize = 400;

      if (isLandscape) {
        const scaledWidth = (naturalWidth / naturalHeight) * containerSize;
        const offsetX = (scaledWidth - containerSize) / 2;
        setImgStyle({
          height: containerSize,
          width: "auto",
          maxWidth: "none",
          marginLeft: -offsetX,
        });
      } else {
        const scaledHeight = (naturalHeight / naturalWidth) * containerSize;
        const offsetY = (scaledHeight - containerSize) / 2;
        setImgStyle({
          width: containerSize,
          height: "auto",
          maxHeight: "none",
          marginTop: -offsetY,
        });
      }
      setCrop(centerAspectCrop(width, height, 1));
    },
    []
  );

  const handleCropComplete = useCallback(
    async (pixelCrop: PixelCrop) => {
      setCompletedCrop(pixelCrop);
      if (imgRef.current && pixelCrop.width && pixelCrop.height) {
        const croppedImageUrl = await getCroppedImage(imgRef.current, pixelCrop);
        setPreviewUrl(croppedImageUrl);
      }
    },
    []
  );

  const handleSave = useCallback(() => {
    if (previewUrl) {
      typedPayload.onSave?.(previewUrl);
      message.success("Avatar updated successfully");
      pop();
    }
  }, [previewUrl, typedPayload, pop]);

  const handleRemove = useCallback(() => {
    typedPayload.onSave?.(null);
    message.success("Avatar removed");
    pop();
  }, [typedPayload, pop]);

  const handleReset = useCallback(() => {
    setImageSrc(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
    setPreviewUrl(typedPayload.currentImage || null);
  }, [typedPayload.currentImage]);

  return (
    <ModalLayout
      name="edit-avatar"
      header={
        <ModalHeader
          name="edit-avatar"
          title="Edit Photo"
          onClose={pop}
          submitButtonProps={{
            onClick: handleSave,
            disabled: !previewUrl,
            children: "Save",
          }}
        />
      }
    >
      <Paper>
        <PaperHeader title="Profile Photo" />
        <div className={styles.container}>
          {!imageSrc ? (
            <div className={styles.uploadArea}>
              <Upload
                accept="image/png,image/jpeg,image/jpg,image/webp"
                showUploadList={false}
                beforeUpload={handleFileSelect}
              >
                <Button icon={<UploadOutlined />}>Select Image</Button>
              </Upload>
              <Typography.Text className={styles.hint}>
                Supports PNG, JPG, JPEG, WEBP. Recommended size: 256x256px.
              </Typography.Text>
            </div>
          ) : (
            <>
              <div className={styles.previewContainer}>
                <div className={styles.cropContainer}>
                  <ReactCrop
                    crop={crop}
                    onChange={(c) => setCrop(c)}
                    onComplete={handleCropComplete}
                    aspect={1}
                    circularCrop
                  >
                    <img
                      ref={imgRef}
                      src={imageSrc}
                      alt="Crop preview"
                      style={imgStyle}
                      onLoad={onImageLoad}
                    />
                  </ReactCrop>
                </div>
                <div className={styles.previewSection}>
                  <Typography.Text className={styles.previewLabel}>
                    Preview
                  </Typography.Text>
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Avatar preview"
                      className={styles.previewAvatar}
                    />
                  ) : (
                    <div className={styles.previewPlaceholder}>
                      <UserOutlined />
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.actions}>
                <Button onClick={handleReset}>Choose Different Image</Button>
                {typedPayload.currentImage && (
                  <Button danger onClick={handleRemove}>
                    Remove Photo
                  </Button>
                )}
              </div>
            </>
          )}
          {!imageSrc && typedPayload.currentImage && (
            <div className={styles.actions}>
              <Button danger onClick={handleRemove}>
                Remove Current Photo
              </Button>
            </div>
          )}
        </div>
      </Paper>
    </ModalLayout>
  );
};
