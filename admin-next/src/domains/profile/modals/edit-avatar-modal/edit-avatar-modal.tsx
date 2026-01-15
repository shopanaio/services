"use client";

import { useState, useCallback } from "react";
import { Upload, Typography, Button, App } from "antd";
import { UploadOutlined, UserOutlined } from "@ant-design/icons";
import { createStyles } from "antd-style";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { ImageCrop } from "@/ui-kit/image-crop";
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

export const EditAvatarModal = () => {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as IEditAvatarModalPayload;

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    typedPayload.currentImage || null
  );

  const handleFileSelect = useCallback((file: File) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setImageSrc(reader.result as string);
    });
    reader.readAsDataURL(file);
    return false;
  }, []);

  const handleApplyCrop = useCallback((croppedUrl: string) => {
    setPreviewUrl(croppedUrl);
    setImageSrc(null);
  }, []);

  const handleCancelCrop = useCallback(() => {
    setImageSrc(null);
  }, []);

  const handleSave = useCallback(() => {
    if (previewUrl) {
      typedPayload.onSave?.(previewUrl);
      message.success("Avatar updated successfully");
      pop();
    }
  }, [previewUrl, typedPayload, message, pop]);

  const handleRemove = useCallback(() => {
    typedPayload.onSave?.(null);
    message.success("Avatar removed");
    pop();
  }, [typedPayload, message, pop]);

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
            <ImageCrop
              imageSrc={imageSrc}
              containerSize={400}
              previewSize={100}
              circularCrop
              onApply={handleApplyCrop}
              onCancel={handleCancelCrop}
            />
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
