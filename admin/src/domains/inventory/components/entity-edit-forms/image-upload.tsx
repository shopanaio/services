import { Button, Flex, Image, Typography } from "antd";
import { DeleteOutlined, UploadOutlined } from "@ant-design/icons";
import { useUploadMediaModal } from "@/domains/media/modals";
import type { ApiFile } from "@/graphql/types";
import { useEntityEditFormStyles } from "./entity-edit-forms.styles";

interface ImageUploadProps {
  value: ApiFile | null;
  onChange: (file: ApiFile | null) => void;
}

export const ImageUpload = ({ value, onChange }: ImageUploadProps) => {
  const { styles } = useEntityEditFormStyles();
  const { push: openUploadModal } = useUploadMediaModal();

  const handleUploadClick = () => {
    openUploadModal({
      accept: "image/*",
      maxFiles: 1,
      onUpload: (files: ApiFile[]) => {
        if (files.length > 0) {
          onChange(files[0]);
        }
      },
    });
  };

  const handleRemove = () => {
    onChange(null);
  };

  if (value) {
    return (
      <div
        className={styles.imagePreviewContainer}
        data-testid="edit-seo-og-image-preview"
      >
        <Image
          src={value.url}
          alt={value.originalName || "OG Image"}
          className={styles.imagePreview}
          preview={false}
        />
        <Button
          type="primary"
          danger
          size="small"
          icon={<DeleteOutlined />}
          className={styles.imageRemoveButton}
          onClick={handleRemove}
          data-testid="edit-seo-og-image-remove-button"
        />
      </div>
    );
  }

  return (
    <div
      className={styles.uploadArea}
      onClick={handleUploadClick}
      role="button"
      tabIndex={0}
      data-testid="edit-seo-og-image-upload-area"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleUploadClick();
        }
      }}
    >
      <Flex align="center" justify="center" vertical>
        <UploadOutlined className={styles.draggerIcon} />
        <Typography.Text strong type="secondary">
          Upload OG Image
        </Typography.Text>
        <Typography.Text type="secondary">
          Recommended: 1200 x 630px
        </Typography.Text>
      </Flex>
    </div>
  );
};
