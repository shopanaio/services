"use client";

import { useState, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { Upload, Typography, Button, Input, Flex, App } from "antd";
import {
  UploadOutlined,
  TeamOutlined,
  WarningOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { createStyles } from "antd-style";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { ImageCropModal } from "@/ui-kit/image-crop";
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

  // Logo state
  const [logoUrl, setLogoUrl] = useState<string | null>(
    typedPayload.currentLogo || null
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

  const logoChanged = logoUrl !== (typedPayload.currentLogo || null);
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

  const handleApplyCrop = useCallback((croppedUrl: string) => {
    setLogoUrl(croppedUrl);
    setImageSrc(null);
  }, []);

  const handleCancelCrop = useCallback(() => {
    setImageSrc(null);
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
    [typedPayload, logoUrl, message, pop]
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
