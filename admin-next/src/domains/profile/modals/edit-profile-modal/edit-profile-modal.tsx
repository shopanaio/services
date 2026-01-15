"use client";

import { useState, useRef, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { Upload, Typography, Button, Input, Flex, Select } from "antd";
import {
  UploadOutlined,
  UserOutlined,
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
import { localeOptions } from "@/domains/workspace/mocks/data";
import type { IEditProfileModalPayload } from "../../modals";
import type { LocaleCode } from "@/graphql/types";

// ============================================================================
// Types
// ============================================================================

interface ProfileFormValues {
  firstName: string;
  lastName: string;
  locale: LocaleCode;
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
  avatarSection: {
    display: "flex",
    alignItems: "flex-start",
    gap: token.marginLG,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: "50%",
    objectFit: "cover",
    border: `1px solid ${token.colorBorder}`,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: "50%",
    border: `1px solid ${token.colorBorder}`,
    background: token.colorPrimaryBg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: token.colorPrimary,
    fontSize: 28,
  },
  avatarHint: {
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
    borderRadius: "50%",
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
  formRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
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
  selectFullWidth: {
    width: "100%",
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
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 90 }, aspect, mediaWidth, mediaHeight),
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

export const EditProfileModal = () => {
  const { styles } = useStyles();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as IEditProfileModalPayload;

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    typedPayload.currentAvatar || null
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
    formState: { isDirty },
  } = useForm<ProfileFormValues>({
    defaultValues: {
      firstName: typedPayload.firstName,
      lastName: typedPayload.lastName,
      locale: typedPayload.locale,
    },
  });

  const avatarChanged = avatarUrl !== (typedPayload.currentAvatar || null);
  const hasChanges = isDirty || avatarChanged;

  // Avatar handlers
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
      setAvatarUrl(cropPreview);
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

  const handleRemoveAvatar = useCallback(() => {
    setAvatarUrl(null);
  }, []);

  // Form submit
  const onSubmit = useCallback(
    async (values: ProfileFormValues) => {
      await typedPayload.onSave?.({
        firstName: values.firstName,
        lastName: values.lastName,
        avatar: avatarUrl,
        locale: values.locale,
      });
      pop();
    },
    [typedPayload, avatarUrl, pop]
  );

  return (
    <ModalLayout
      name="edit-profile"
      header={
        <ModalHeader
          name="edit-profile"
          title="Edit Profile"
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
        <PaperHeader title="Profile Photo" />
        <div className={styles.container}>
          {!imageSrc ? (
            <div className={styles.avatarSection}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className={styles.avatarImage}
                />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  <UserOutlined />
                </div>
              )}
              <Flex vertical gap={8}>
                <Upload
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  showUploadList={false}
                  beforeUpload={handleFileSelect}
                >
                  <Button icon={<UploadOutlined />}>
                    {avatarUrl ? "Change Photo" : "Upload Photo"}
                  </Button>
                </Upload>
                {avatarUrl && (
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={handleRemoveAvatar}
                  >
                    Remove
                  </Button>
                )}
                <Typography.Text className={styles.avatarHint}>
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
                    circularCrop
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
                      alt="Avatar preview"
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
        <PaperHeader title="Personal Information" />
        <form className={styles.formSection}>
          <div className={styles.formRow}>
            <div className={styles.formItem}>
              <Typography.Text className={styles.label}>
                First Name
              </Typography.Text>
              <Controller
                name="firstName"
                control={control}
                render={({ field }) => (
                  <Input {...field} placeholder="First name" />
                )}
              />
            </div>
            <div className={styles.formItem}>
              <Typography.Text className={styles.label}>
                Last Name
              </Typography.Text>
              <Controller
                name="lastName"
                control={control}
                render={({ field }) => (
                  <Input {...field} placeholder="Last name" />
                )}
              />
            </div>
          </div>

          <div className={styles.formItem}>
            <Typography.Text className={styles.label}>Language</Typography.Text>
            <Controller
              name="locale"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  options={localeOptions}
                  className={styles.selectFullWidth}
                />
              )}
            />
          </div>
        </form>
      </Paper>
    </ModalLayout>
  );
};
