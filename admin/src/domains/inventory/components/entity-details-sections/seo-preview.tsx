"use client";

import { useState } from "react";
import { Flex, Image, Tabs, Typography } from "antd";
import {
  FacebookOutlined,
  GoogleOutlined,
  PictureOutlined,
} from "@ant-design/icons";
import { useSeoPreviewStyles } from "./seo-preview.styles";
import type { EntitySeoPreviewData } from "./types";

const DEFAULT_BASE_URL = "yourstore.com";

interface SeoPreviewProps {
  data: EntitySeoPreviewData;
}

const GooglePreview = ({ data }: SeoPreviewProps) => {
  const { styles } = useSeoPreviewStyles();
  const title = data.seoTitle || data.title || "Untitled Product";
  const description =
    data.seoDescription || "No description available for this product.";
  const baseUrl = data.baseUrl || DEFAULT_BASE_URL;
  const resourcePath = data.resourcePath || `products › ${data.slug || "product"}`;

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
        {baseUrl} › {resourcePath}
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

const FacebookPreview = ({ data }: SeoPreviewProps) => {
  const { styles } = useSeoPreviewStyles();
  const title = data.ogTitle || data.seoTitle || data.title || "Untitled";
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

export const SeoPreview = ({ data }: SeoPreviewProps) => {
  const { styles } = useSeoPreviewStyles();
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
