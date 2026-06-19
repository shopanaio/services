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
    <div className={styles.googlePreview} data-testid="seo-preview-google">
      <Typography.Text
        className={styles.googleTitle}
        data-testid="seo-preview-google-title"
      >
        {title}
      </Typography.Text>
      <Typography.Text
        className={styles.googleUrl}
        data-testid="seo-preview-google-url"
      >
        {baseUrl} › products › {data.productSlug || "product"}
      </Typography.Text>
      <Typography.Text
        className={styles.googleDescription}
        data-testid="seo-preview-google-description"
      >
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
    <div className={styles.socialPreview} data-testid="seo-preview-facebook">
      {data.ogImage ? (
        <div
          className={styles.socialImageWrapper}
          data-testid="seo-preview-facebook-image"
        >
          <Image src={data.ogImage.url} alt="" preview={false} />
        </div>
      ) : (
        <div
          className={styles.socialImagePlaceholder}
          data-testid="seo-preview-facebook-image-placeholder"
        >
          <PictureOutlined className={styles.socialImageIcon} />
        </div>
      )}
      <div className={styles.socialContent}>
        <Typography.Text
          className={styles.socialDomain}
          data-testid="seo-preview-facebook-domain"
        >
          {baseUrl.replace(/^https?:\/\//, "")}
        </Typography.Text>
        <Typography.Text
          className={styles.socialTitle}
          data-testid="seo-preview-facebook-title"
        >
          {title}
        </Typography.Text>
        <Typography.Text
          className={styles.socialDescription}
          data-testid="seo-preview-facebook-description"
        >
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
      data-testid="seo-preview-tabs"
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
