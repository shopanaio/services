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
        <Image
          src={values.ogImage.url}
          alt=""
          className={styles.socialImage}
          preview={false}
          style={{ height: 200, objectFit: "cover" }}
        />
      ) : (
        <div className={styles.socialImage}>
          <PictureOutlined style={{ fontSize: 48 }} />
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
