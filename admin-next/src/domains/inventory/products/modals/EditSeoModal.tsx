"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  Input,
  Typography,
  Tabs,
  Image,
  Button,
  Flex,
} from "antd";
import {
  GoogleOutlined,
  FacebookOutlined,
  PictureOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { createStyles } from "antd-style";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { Paper } from "../components/Paper";
import { PaperHeader } from "../components/PaperHeader";
import type { IEditSeoModalPayload } from "../modals";
import type { IMediaFile } from "../mocks/types";

// ============================================================================
// Types
// ============================================================================

export interface ISeoFormValues {
  // Basic SEO
  seoTitle: string;
  seoDescription: string;
  // Open Graph
  ogTitle: string;
  ogDescription: string;
  ogImage: IMediaFile | null;
}

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  formSection: {
    marginBottom: 20,
  },
  formItem: {
    marginBottom: 16,
  },
  formItemLast: {
    marginBottom: 0,
  },
  label: {
    display: "block",
    marginBottom: 4,
    fontSize: token.fontSize,
  },
  // Preview styles
  previewTabs: {
    "& .ant-tabs-nav": {
      marginBottom: 12,
    },
  },
  googlePreview: {
    background: token.colorBgLayout,
    borderRadius: 8,
    padding: 16,
  },
  googleTitle: {
    fontSize: 18,
    color: "#1a0dab",
    display: "block",
    lineHeight: 1.3,
    marginBottom: 4,
    "&:hover": {
      textDecoration: "underline",
      cursor: "pointer",
    },
  },
  googleUrl: {
    fontSize: 13,
    color: "#006621",
    display: "block",
    marginBottom: 4,
  },
  googleDescription: {
    fontSize: 13,
    color: "#545454",
    lineHeight: 1.5,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  socialPreview: {
    background: token.colorBgLayout,
    borderRadius: 8,
    overflow: "hidden",
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  socialImage: {
    width: "100%",
    height: 200,
    objectFit: "cover",
    background: token.colorBgContainerDisabled,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: token.colorTextSecondary,
  },
  socialContent: {
    padding: 12,
  },
  socialDomain: {
    fontSize: 11,
    color: token.colorTextSecondary,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  socialTitle: {
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1.3,
    marginBottom: 4,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  socialDescription: {
    fontSize: 13,
    color: token.colorTextSecondary,
    lineHeight: 1.4,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  // Image upload
  imageUploadArea: {
    border: `1px dashed ${token.colorBorder}`,
    borderRadius: 8,
    padding: 16,
    textAlign: "center",
    cursor: "pointer",
    transition: "all 0.2s",
    "&:hover": {
      borderColor: token.colorPrimary,
      background: token.colorBgTextHover,
    },
  },
  imagePreviewContainer: {
    position: "relative",
    borderRadius: 8,
    overflow: "hidden",
  },
  imagePreview: {
    width: "100%",
    height: 120,
    objectFit: "cover",
  },
  imageRemoveButton: {
    position: "absolute",
    top: 8,
    right: 8,
  },
}));

// ============================================================================
// Constants
// ============================================================================

const SEO_TITLE_MAX = 60;
const SEO_DESCRIPTION_MAX = 160;
const OG_TITLE_MAX = 95;
const OG_DESCRIPTION_MAX = 200;

interface IImageUploadProps {
  value: IMediaFile | null;
  onChange: (file: IMediaFile | null) => void;
  aspectRatio?: string;
}

const ImageUpload = ({ value, onChange }: IImageUploadProps) => {
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
        driver: "LOCAL" as const,
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

// ============================================================================
// Preview Components
// ============================================================================

interface IPreviewProps {
  values: ISeoFormValues;
  productTitle: string;
  baseUrl: string;
  slug?: string;
}

const GooglePreview = ({ values, productTitle, baseUrl, slug }: IPreviewProps) => {
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

const FacebookPreview = ({ values, productTitle, baseUrl }: IPreviewProps) => {
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

// ============================================================================
// Main Component
// ============================================================================

export const EditSeoModal = () => {
  const { styles } = useStyles();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as IEditSeoModalPayload;
  const [activeTab, setActiveTab] = useState("google");

  const {
    control,
    handleSubmit,
    watch,
  } = useForm<ISeoFormValues>({
    defaultValues: {
      seoTitle: typedPayload.seoTitle || "",
      seoDescription: typedPayload.seoDescription || "",
      ogTitle: typedPayload.ogTitle || "",
      ogDescription: typedPayload.ogDescription || "",
      ogImage: typedPayload.ogImage || null,
    },
  });

  const values = watch();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        pop();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pop]);

  const onSubmit = (formValues: ISeoFormValues) => {
    typedPayload.onSave?.(formValues);
    pop();
  };

  const baseUrl = typedPayload.baseUrl || "yourstore.com";

  const previewItems = [
    {
      key: "google",
      label: (
        <Flex align="center" gap={6}>
          <GoogleOutlined />
          Google
        </Flex>
      ),
      children: (
        <GooglePreview
          values={values}
          productTitle={typedPayload.productTitle || ""}
          baseUrl={baseUrl}
          slug={typedPayload.productSlug}
        />
      ),
    },
    {
      key: "facebook",
      label: (
        <Flex align="center" gap={6}>
          <FacebookOutlined />
          Facebook
        </Flex>
      ),
      children: (
        <FacebookPreview
          values={values}
          productTitle={typedPayload.productTitle || ""}
          baseUrl={baseUrl}
        />
      ),
    },
  ];

  return (
    <ModalLayout
      name="edit-seo"
      header={
        <ModalHeader
          name="edit-seo"
          title="Edit SEO & Social"
          onClose={pop}
          submitButtonProps={{
            onClick: handleSubmit(onSubmit),
          }}
        />
      }
    >
      <Flex vertical gap={16}>
        {/* Basic SEO */}
        <Paper>
          <PaperHeader title="Search Engine Optimization" />
          <form>
            <div className={styles.formItem}>
              <Typography.Text strong className={styles.label}>
                Meta Title
              </Typography.Text>
              <Controller
                name="seoTitle"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder={typedPayload.productTitle || "Enter meta title"}
                    maxLength={SEO_TITLE_MAX}
                    showCount
                  />
                )}
              />
            </div>

            <div className={styles.formItemLast}>
              <Typography.Text strong className={styles.label}>
                Meta Description
              </Typography.Text>
              <Controller
                name="seoDescription"
                control={control}
                render={({ field }) => (
                  <Input.TextArea
                    {...field}
                    placeholder="Enter meta description"
                    rows={3}
                    maxLength={SEO_DESCRIPTION_MAX}
                    showCount
                  />
                )}
              />
            </div>
          </form>
        </Paper>

        {/* Open Graph */}
        <Paper>
          <PaperHeader
            title="Open Graph"
            extra={
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Facebook, LinkedIn, etc.
              </Typography.Text>
            }
          />
          <form>
            <div className={styles.formItem}>
              <Typography.Text strong className={styles.label}>
                OG Title
              </Typography.Text>
              <Controller
                name="ogTitle"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder={values.seoTitle || "Enter OG title"}
                    maxLength={OG_TITLE_MAX}
                    showCount
                  />
                )}
              />
            </div>

            <div className={styles.formItem}>
              <Typography.Text strong className={styles.label}>
                OG Description
              </Typography.Text>
              <Controller
                name="ogDescription"
                control={control}
                render={({ field }) => (
                  <Input.TextArea
                    {...field}
                    placeholder={values.seoDescription || "Enter OG description"}
                    rows={2}
                    maxLength={OG_DESCRIPTION_MAX}
                    showCount
                  />
                )}
              />
            </div>

            <div className={styles.formItemLast}>
              <Typography.Text strong className={styles.label}>
                OG Image
              </Typography.Text>
              <Controller
                name="ogImage"
                control={control}
                render={({ field }) => (
                  <ImageUpload value={field.value} onChange={field.onChange} />
                )}
              />
            </div>
          </form>
        </Paper>

        {/* Preview */}
        <Paper>
          <PaperHeader title="Preview" />
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={previewItems}
            className={styles.previewTabs}
            size="small"
          />
        </Paper>
      </Flex>
    </ModalLayout>
  );
};
