import { Typography } from "antd";
import { useStyles } from "../EditSeoModal.styles";
import type { IPreviewProps } from "../types";

export const GooglePreview = ({
  values,
  productTitle,
  baseUrl,
  slug,
}: IPreviewProps) => {
  const { styles } = useStyles();
  const title = values.seoTitle || productTitle || "Untitled Product";
  const description =
    values.seoDescription || "No description available for this product.";

  return (
    <div className={styles.googlePreview}>
      <Typography.Text className={styles.googleTitle}>{title}</Typography.Text>
      <Typography.Text className={styles.googleUrl}>
        {baseUrl} › products › {slug || "product"}
      </Typography.Text>
      <Typography.Text className={styles.googleDescription}>
        {description}
      </Typography.Text>
    </div>
  );
};
