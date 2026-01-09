"use client";

import { useState } from "react";
import { Tabs, Typography, Image, Flex } from "antd";
import { GoogleOutlined, FacebookOutlined, PictureOutlined } from "@ant-design/icons";
import { useStyles } from "./seo-preview.styles";
import type { ISeoPreviewData } from "./seo-preview.types";

const DEFAULT_BASE_URL = "yourstore.com";

interface ISeoPreviewProps {
  data: ISeoPreviewData;
}

const GooglePreview = ({ data }: { data: ISeoPreviewData }) => {
  const { styles } = useStyles();
  const title = data.seoTitle || data.productTitle || "Untitled Product";
  const description =
    data.seoDescription || "No description available for this product.";
  const baseUrl = data.baseUrl || DEFAULT_BASE_URL;

  return (
    <div className={styles.googlePreview}>
      <Typography.Text className={styles.googleTitle}>{title}</Typography.Text>
      <Typography.Text className={styles.googleUrl}>
        {baseUrl} › products › {data.productSlug || "product"}
      </Typography.Text>
      <Typography.Text className={styles.googleDescription}>
        {description}
      </Typography.Text>
    </div>
  );
};

const FacebookPreview = ({ data }: { data: ISeoPreviewData }) => {
  const { styles } = useStyles();
  const title =
    data.ogTitle || data.seoTitle || data.productTitle || "Untitled";
  const description =
    data.ogDescription || data.seoDescription || "No description available.";
  const baseUrl = data.baseUrl || DEFAULT_BASE_URL;

  return (
    <div className={styles.socialPreview}>
      {data.ogImage ? (
        <div className={styles.socialImageWrapper}>
          <Image src={data.ogImage.url} alt="" preview={false} />
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

export const SeoPreview = ({ data }: ISeoPreviewProps) => {
  const { styles } = useStyles();
  const [activeTab, setActiveTab] = useState("google");

  return (
    <Tabs
      activeKey={activeTab}
      onChange={setActiveTab}
      items={[
        {
          key: "google",
          label: (
            <Flex align="center" gap={6}>
              <GoogleOutlined />
              Google
            </Flex>
          ),
          children: <GooglePreview data={data} />,
        },
        {
          key: "facebook",
          label: (
            <Flex align="center" gap={6}>
              <FacebookOutlined />
              Facebook
            </Flex>
          ),
          children: <FacebookPreview data={data} />,
        },
      ]}
      className={styles.previewTabs}
      size="small"
    />
  );
};
