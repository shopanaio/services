import { Typography, Image, Button } from "antd";
import { PictureOutlined, DeleteOutlined } from "@ant-design/icons";
import { useStyles } from "../EditSeoModal.styles";
import { FileDriver, type IMediaFile } from "../../../mocks/types";

interface IImageUploadProps {
  value: IMediaFile | null;
  onChange: (file: IMediaFile | null) => void;
}

export const ImageUpload = ({ value, onChange }: IImageUploadProps) => {
  const { styles } = useStyles();

  const handleClick = () => {
    // In real implementation, this would open a media picker modal
    // For now, we'll use a mock image
    if (!value) {
      onChange({
        id: `mock-${Date.now()}`,
        url: "https://placehold.co/1200x630/EEE/31343C?text=OG+Image",
        name: "og-image.jpg",
        size: 50000,
        ext: "jpg",
        driver: FileDriver.LOCAL,
        key: `og-image-${Date.now()}`,
      });
    }
  };

  if (value) {
    return (
      <div className={styles.imagePreviewContainer}>
        <Image
          src={value.url}
          alt={value.name}
          className={styles.imagePreview}
          preview={false}
        />
        <Button
          type="primary"
          danger
          size="small"
          icon={<DeleteOutlined />}
          className={styles.imageRemoveButton}
          onClick={() => onChange(null)}
        />
      </div>
    );
  }

  return (
    <div className={styles.imageUploadArea} onClick={handleClick}>
      <PictureOutlined style={{ fontSize: 24, marginBottom: 8 }} />
      <Typography.Text type="secondary" style={{ display: "block" }}>
        Click to select image
      </Typography.Text>
      <Typography.Text type="secondary" style={{ fontSize: 11 }}>
        Recommended: 1200 x 630px
      </Typography.Text>
    </div>
  );
};
