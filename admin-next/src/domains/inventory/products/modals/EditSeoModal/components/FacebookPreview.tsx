import { Typography, Image } from "antd";
import { PictureOutlined } from "@ant-design/icons";
import { useStyles } from "../EditSeoModal.styles";
import type { IPreviewProps } from "../types";

export const FacebookPreview = ({
  values,
  productTitle,
  baseUrl,
}: IPreviewProps) => {
  const { styles } = useStyles();
  const title = values.ogTitle || values.seoTitle || productTitle || "Untitled";
  const description =
    values.ogDescription ||
    values.seoDescription ||
    "No description available.";

  return (
    <div className={styles.socialPreview}>
      {values.ogImage ? (
        <div className={styles.socialImageWrapper}>
          <Image src={values.ogImage.url} alt="" preview={false} />
        </div>
      ) : (
        <div className={styles.socialImagePlaceholder}>
          <PictureOutlined className={styles.socialImageIcon} />
        </div>
      )}
      <div className={styles.socialContent}>
        <Typography.Text className={styles.socialDomain}>
          {baseUrl.replace(/^https?:\/\//, "")}
        </Typography.Text>
        <Typography.Text className={styles.socialTitle}>{title}</Typography.Text>
        <Typography.Text className={styles.socialDescription}>
          {description}
        </Typography.Text>
      </div>
    </div>
  );
};
