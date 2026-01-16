"use client";

import { useState, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { Upload, Typography, Button, Input, Flex, App, Spin } from "antd";
import {
  UploadOutlined,
  TeamOutlined,
  WarningOutlined,
  DeleteOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import { createStyles } from "antd-style";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { ImageCropModal } from "@/ui-kit/image-crop";
import { useUploadFiles } from "@/domains/media/hooks/use-upload-files";
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
    alignItems: "center",
    gap: token.marginLG,
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
  logoHint: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
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
// Component
// ============================================================================

export const EditOrganizationModal = () => {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as IEditOrganizationModalPayload;

  // Upload hook
  const { uploadFile, loading: uploading } = useUploadFiles();

  // Logo state - store both URL (for display) and ID (for form submission)
  const [logoUrl, setLogoUrl] = useState<string | null>(
    typedPayload.currentLogo || null
  );
  const [logoId, setLogoId] = useState<string | null>(
    typedPayload.currentLogoId || null
  );
  const [imageSrc, setImageSrc] = useState<string | null>(null);

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

  const logoChanged = logoId !== (typedPayload.currentLogoId || null);
  const hasChanges = isDirty || logoChanged;

  // Logo handlers
  const handleFileSelect = useCallback((file: File) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setImageSrc(reader.result as string);
    });
    reader.readAsDataURL(file);
    return false;
  }, []);

  const handleApplyCrop = useCallback(
    async (croppedUrl: string) => {
      setImageSrc(null);

      // Convert base64 to File
      const response = await fetch(croppedUrl);
      const blob = await response.blob();
      const file = new File([blob], "logo.jpg", { type: "image/jpeg" });

      // Upload file to server
      const result = await uploadFile(file);

      if (result.file) {
        setLogoUrl(result.file.url);
        setLogoId(result.file.id);
      }
    },
    [uploadFile]
  );

  const handleCancelCrop = useCallback(() => {
    setImageSrc(null);
  }, []);

  const handleRemoveLogo = useCallback(() => {
    setLogoUrl(null);
    setLogoId(null);
  }, []);

  // Form submit
  const onSubmit = useCallback(
    (values: OrganizationFormValues) => {
      typedPayload.onSave?.({
        displayName: values.displayName,
        slug: values.slug,
        logoId,
      });
      message.success("Organization updated successfully");
      pop();
    },
    [typedPayload, logoId, message, pop]
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
          <div className={styles.logoSection}>
            {uploading ? (
              <div className={styles.avatarPlaceholder}>
                <Spin indicator={<LoadingOutlined spin />} />
              </div>
            ) : logoUrl ? (
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
              <Flex gap={8}>
                <Upload
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  showUploadList={false}
                  beforeUpload={handleFileSelect}
                  disabled={uploading}
                >
                  <Button icon={<UploadOutlined />} disabled={uploading}>
                    {logoUrl ? "Change Logo" : "Upload Logo"}
                  </Button>
                </Upload>
                {logoUrl && (
                  <Button
                    icon={<DeleteOutlined />}
                    danger
                    onClick={handleRemoveLogo}
                    disabled={uploading}
                  />
                )}
              </Flex>
              <Typography.Text className={styles.logoHint}>
                PNG, JPG or WEBP. 256×256px recommended.
              </Typography.Text>
            </Flex>
          </div>
          <ImageCropModal
            open={!!imageSrc}
            imageSrc={imageSrc || ""}
            title="Crop Logo"
            previewBorderRadius={8}
            onApply={handleApplyCrop}
            onClose={handleCancelCrop}
          />
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
