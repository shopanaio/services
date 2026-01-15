"use client";

import { useState, useRef, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { Upload, Typography, Button, Input, Avatar, Flex, App } from "antd";
import {
  UploadOutlined,
  TeamOutlined,
  WarningOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
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
import type { IEditOrganizationModalPayload } from "../../modals";

// ============================================================================
// Types
// ============================================================================

interface OrganizationFormValues {
  displayName: string;
  slug: string;
}

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: token.marginLG,
  },
  logoSection: {
    display: "flex",
    alignItems: "flex-start",
    gap: token.marginLG,
  },
  avatarWrapper: {
    position: "relative",
    flexShrink: 0,
  },
  avatar: {
    backgroundColor: token.colorPrimary,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: token.borderRadiusLG,
    objectFit: "cover",
    border: `1px solid ${token.colorBorder}`,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: token.borderRadiusLG,
    border: `1px solid ${token.colorBorder}`,
    background: token.colorPrimaryBg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: token.colorPrimary,
    fontSize: 28,
  },
  logoActions: {
    display: "flex",
    flexDirection: "column",
    gap: token.marginXS,
  },
  logoHint: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
  cropModal: {
    display: "flex",
    flexDirection: "column",
    gap: token.marginMD,
  },
  cropContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: token.marginLG,
  },
  cropArea: {
    width: 300,
    height: 300,
    overflow: "hidden",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    "& .ReactCrop": {
      maxWidth: "100%",
      maxHeight: "100%",
    },
  },
  cropImage: {
    display: "block",
    maxWidth: 300,
    maxHeight: 300,
    objectFit: "contain",
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
  previewAvatar: {
    width: 80,
    height: 80,
    borderRadius: token.borderRadiusLG,
    objectFit: "cover",
    border: `1px solid ${token.colorBorder}`,
  },
  cropActions: {
    display: "flex",
    justifyContent: "center",
    gap: token.marginSM,
  },
  formSection: {
    display: "flex",
    flexDirection: "column",
    gap: token.marginMD,
  },
  formItem: {
    display: "flex",
    flexDirection: "column",
    gap: token.marginXXS,
  },
  label: {
    fontWeight: 500,
    fontSize: token.fontSizeSM,
  },
  warning: {
    display: "flex",
    alignItems: "center",
    gap: token.marginXS,
    color: token.colorWarning,
    fontSize: token.fontSizeSM,
    marginTop: token.marginXXS,
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
    makeAspectCrop({ unit: "%", width: cropSize }, aspect, mediaWidth, mediaHeight),
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

// ============================================================================
// Component
// ============================================================================

export const EditOrganizationModal = () => {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as IEditOrganizationModalPayload;

  // Logo state
  const [logoUrl, setLogoUrl] = useState<string | null>(
    typedPayload.currentLogo || null
  );
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [cropPreview, setCropPreview] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Form state
  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<OrganizationFormValues>({
    defaultValues: {
      displayName: typedPayload.displayName,
      slug: typedPayload.slug,
    },
  });

  const logoChanged = logoUrl !== (typedPayload.currentLogo || null);
  const hasChanges = isDirty || logoChanged;

  // Logo handlers
  const handleFileSelect = useCallback((file: File) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setImageSrc(reader.result as string);
      setCropPreview(null);
    });
    reader.readAsDataURL(file);
    return false;
  }, []);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, 1));
    },
    []
  );

  const handleCropComplete = useCallback(async (pixelCrop: PixelCrop) => {
    setCompletedCrop(pixelCrop);
    if (imgRef.current && pixelCrop.width && pixelCrop.height) {
      const croppedUrl = await getCroppedImage(imgRef.current, pixelCrop);
      setCropPreview(croppedUrl);
    }
  }, []);

  const handleApplyCrop = useCallback(() => {
    if (cropPreview) {
      setLogoUrl(cropPreview);
      setImageSrc(null);
      setCrop(undefined);
      setCompletedCrop(undefined);
      setCropPreview(null);
    }
  }, [cropPreview]);

  const handleCancelCrop = useCallback(() => {
    setImageSrc(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
    setCropPreview(null);
  }, []);

  const handleRemoveLogo = useCallback(() => {
    setLogoUrl(null);
  }, []);

  // Form submit
  const onSubmit = useCallback(
    (values: OrganizationFormValues) => {
      typedPayload.onSave?.({
        displayName: values.displayName,
        slug: values.slug,
        logo: logoUrl,
      });
      message.success("Organization updated successfully");
      pop();
    },
    [typedPayload, logoUrl, pop]
  );

  return (
    <ModalLayout
      name="edit-organization"
      header={
        <ModalHeader
          name="edit-organization"
          title="Edit Organization"
          onClose={pop}
          submitButtonProps={{
            onClick: handleSubmit(onSubmit),
            disabled: !hasChanges,
            children: "Save Changes",
          }}
        />
      }
    >
      <Paper>
        <PaperHeader title="Organization Logo" />
        <div className={styles.container}>
          {!imageSrc ? (
            <div className={styles.logoSection}>
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Organization logo"
                  className={styles.avatarImage}
                />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  <TeamOutlined />
                </div>
              )}
              <Flex vertical gap={8}>
                <Upload
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  showUploadList={false}
                  beforeUpload={handleFileSelect}
                >
                  <Button icon={<UploadOutlined />}>
                    {logoUrl ? "Change Logo" : "Upload Logo"}
                  </Button>
                </Upload>
                {logoUrl && (
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={handleRemoveLogo}
                  >
                    Remove
                  </Button>
                )}
                <Typography.Text className={styles.logoHint}>
                  PNG, JPG or WEBP. 256×256px recommended.
                </Typography.Text>
              </Flex>
            </div>
          ) : (
            <div className={styles.cropModal}>
              <div className={styles.cropContainer}>
                <div className={styles.cropArea}>
                  <ReactCrop
                    crop={crop}
                    onChange={(c) => setCrop(c)}
                    onComplete={handleCropComplete}
                    aspect={1}
                  >
                    <img
                      ref={imgRef}
                      src={imageSrc}
                      alt="Crop preview"
                      className={styles.cropImage}
                      onLoad={onImageLoad}
                    />
                  </ReactCrop>
                </div>
                {cropPreview && (
                  <div className={styles.previewSection}>
                    <Typography.Text className={styles.previewLabel}>
                      Preview
                    </Typography.Text>
                    <img
                      src={cropPreview}
                      alt="Logo preview"
                      className={styles.previewAvatar}
                    />
                  </div>
                )}
              </div>
              <div className={styles.cropActions}>
                <Button onClick={handleCancelCrop}>Cancel</Button>
                <Button
                  type="primary"
                  onClick={handleApplyCrop}
                  disabled={!cropPreview}
                >
                  Apply
                </Button>
              </div>
            </div>
          )}
        </div>
      </Paper>

      <Paper>
        <PaperHeader title="Organization Details" />
        <form className={styles.formSection}>
          <div className={styles.formItem}>
            <Typography.Text className={styles.label}>
              Display Name
            </Typography.Text>
            <Controller
              name="displayName"
              control={control}
              rules={{
                required: "Display name is required",
                minLength: {
                  value: 1,
                  message: "Display name must be at least 1 character",
                },
                maxLength: {
                  value: 256,
                  message: "Display name must be at most 256 characters",
                },
              }}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="Organization name"
                  status={errors.displayName ? "error" : undefined}
                />
              )}
            />
            {errors.displayName && (
              <Typography.Text type="danger">
                {errors.displayName.message}
              </Typography.Text>
            )}
          </div>

          <div className={styles.formItem}>
            <Typography.Text className={styles.label}>
              Organization Slug
            </Typography.Text>
            <Controller
              name="slug"
              control={control}
              rules={{
                required: "Slug is required",
                minLength: {
                  value: 3,
                  message: "Slug must be at least 3 characters",
                },
                maxLength: {
                  value: 64,
                  message: "Slug must be at most 64 characters",
                },
                pattern: {
                  value: /^[a-z0-9]+(-[a-z0-9]+)*$/,
                  message:
                    "Only lowercase letters, numbers, and hyphens. Cannot start or end with hyphen.",
                },
              }}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="organization-slug"
                  status={errors.slug ? "error" : undefined}
                />
              )}
            />
            {errors.slug ? (
              <Typography.Text type="danger">
                {errors.slug.message}
              </Typography.Text>
            ) : (
              <div className={styles.warning}>
                <WarningOutlined />
                <span>Changing slug will break existing links</span>
              </div>
            )}
          </div>
        </form>
      </Paper>
    </ModalLayout>
  );
};
