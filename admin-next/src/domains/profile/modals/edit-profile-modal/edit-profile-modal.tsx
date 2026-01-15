"use client";

import { useState, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { Upload, Typography, Button, Input, Flex, Select } from "antd";
import {
  UploadOutlined,
  UserOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { createStyles } from "antd-style";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { ImageCrop } from "@/ui-kit/image-crop";
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

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    typedPayload.currentAvatar || null
  );
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

  const avatarChanged = avatarUrl !== (typedPayload.currentAvatar || null);
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

  const handleApplyCrop = useCallback((croppedUrl: string) => {
    setAvatarUrl(croppedUrl);
    setImageSrc(null);
  }, []);

  const handleCancelCrop = useCallback(() => {
    setImageSrc(null);
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
            <ImageCrop
              imageSrc={imageSrc}
              circularCrop
              onApply={handleApplyCrop}
              onCancel={handleCancelCrop}
            />
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
