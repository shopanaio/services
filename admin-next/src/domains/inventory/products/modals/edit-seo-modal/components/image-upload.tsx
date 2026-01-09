import { Upload, Typography, Image, Button, Flex } from "antd";
import { UploadOutlined, DeleteOutlined } from "@ant-design/icons";
import { useStyles } from "../edit-seo-modal.styles";
import { FileDriver, type IMediaFile } from "@/mocks/products/types";

interface IImageUploadProps {
  value: IMediaFile | null;
  onChange: (file: IMediaFile | null) => void;
}

export const ImageUpload = ({ value, onChange }: IImageUploadProps) => {
  const { styles } = useStyles();

  const handleUpload = (file: File) => {
    onChange({
      id: `file-${Date.now()}`,
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
      ext: file.name.split(".").pop() || "",
      driver: FileDriver.LOCAL,
      key: `og-image-${Date.now()}`,
    });
    return false;
  };

  const handleRemove = () => {
    if (value?.url.startsWith("blob:")) {
      URL.revokeObjectURL(value.url);
    }
    onChange(null);
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
          onClick={handleRemove}
        />
      </div>
    );
  }

  return (
    <Upload.Dragger
      accept="image/*"
      showUploadList={false}
      beforeUpload={handleUpload}
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
    </Upload.Dragger>
  );
};
