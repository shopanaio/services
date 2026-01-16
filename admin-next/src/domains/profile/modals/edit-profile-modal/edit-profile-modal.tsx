"use client";

import { useState, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { Upload, Typography, Button, Input, Flex, Select, Spin } from "antd";
import {
  UploadOutlined,
  UserOutlined,
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
import { localeOptions } from "@/domains/workspace/mocks/data";
import { useAvatarUpload } from "@/domains/media/hooks/use-avatar-upload";
import { CURRENT_USER_QUERY } from "@/domains/auth/graphql";
import { useApolloClient } from "@apollo/client/react";
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
    alignItems: "center",
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
// Component
// ============================================================================

export const EditProfileModal = () => {
  const { styles } = useStyles();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as IEditProfileModalPayload;
  const apolloClient = useApolloClient();

  // Upload hook
  const { uploadAvatar, loading: uploading } = useAvatarUpload();

  // Avatar state - store URL for display and track if changed
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    typedPayload.currentAvatar || null
  );
  const [avatarChanged, setAvatarChanged] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

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

  const hasChanges = isDirty || avatarChanged;

  // Avatar handlers
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
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });

      // Upload avatar directly to user's asset group
      const result = await uploadAvatar(file, typedPayload.userId);

      if (result.file) {
        setAvatarUrl(result.file.url);
        setAvatarChanged(true);
        // Refetch current user to update avatar in UI
        apolloClient.refetchQueries({ include: [CURRENT_USER_QUERY] });
      }
    },
    [uploadAvatar, typedPayload.userId, apolloClient]
  );

  const handleCancelCrop = useCallback(() => {
    setImageSrc(null);
  }, []);

  const handleRemoveAvatar = useCallback(() => {
    setAvatarUrl(null);
    setAvatarChanged(true);
    // TODO: Implement avatar removal when API supports it
  }, []);

  // Form submit
  const onSubmit = useCallback(
    async (values: ProfileFormValues) => {
      await typedPayload.onSave?.({
        firstName: values.firstName,
        lastName: values.lastName,
        avatarChanged,
        locale: values.locale,
      });
      pop();
    },
    [typedPayload, avatarChanged, pop]
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
          <div className={styles.avatarSection}>
            {uploading ? (
              <div className={styles.avatarPlaceholder}>
                <Spin indicator={<LoadingOutlined spin />} />
              </div>
            ) : avatarUrl ? (
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
              <Flex gap={8}>
                <Upload
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  showUploadList={false}
                  beforeUpload={handleFileSelect}
                  disabled={uploading}
                >
                  <Button
                    icon={<UploadOutlined />}
                    size="small"
                    disabled={uploading}
                  >
                    {avatarUrl ? "Change Photo" : "Upload Photo"}
                  </Button>
                </Upload>
                {avatarUrl && (
                  <Button
                    icon={<DeleteOutlined />}
                    size="small"
                    danger
                    onClick={handleRemoveAvatar}
                    disabled={uploading}
                  />
                )}
              </Flex>

              <Typography.Text className={styles.avatarHint}>
                PNG, JPG or WEBP. 256×256px recommended.
              </Typography.Text>
            </Flex>
          </div>
          <ImageCropModal
            open={!!imageSrc}
            imageSrc={imageSrc || ""}
            title="Crop Photo"
            circularCrop
            onApply={handleApplyCrop}
            onClose={handleCancelCrop}
          />
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
