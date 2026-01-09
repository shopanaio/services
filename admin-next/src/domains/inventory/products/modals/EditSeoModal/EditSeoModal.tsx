"use client";

import { useState, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { Input, Typography, Tabs, Flex } from "antd";
import { GoogleOutlined, FacebookOutlined } from "@ant-design/icons";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { Paper } from "../../components/Paper";
import { PaperHeader } from "../../components/PaperHeader";
import type { IEditSeoModalPayload } from "../../modals";
import { useStyles } from "./EditSeoModal.styles";
import {
  SEO_TITLE_MAX,
  SEO_DESCRIPTION_MAX,
  OG_TITLE_MAX,
  OG_DESCRIPTION_MAX,
} from "./EditSeoModal.constants";
import { GooglePreview, FacebookPreview, ImageUpload } from "./components";
import type { ISeoFormValues } from "./types";

export const EditSeoModal = () => {
  const { styles } = useStyles();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as IEditSeoModalPayload;
  const [activeTab, setActiveTab] = useState("google");

  const { control, handleSubmit, watch } = useForm<ISeoFormValues>({
    defaultValues: {
      seoTitle: typedPayload.seoTitle || "",
      seoDescription: typedPayload.seoDescription || "",
      ogTitle: typedPayload.ogTitle || "",
      ogDescription: typedPayload.ogDescription || "",
      ogImage: typedPayload.ogImage || null,
    },
  });

  const values = watch();
  const baseUrl = typedPayload.baseUrl || "yourstore.com";

  const onSubmit = (formValues: ISeoFormValues) => {
    typedPayload.onSave?.(formValues);
    pop();
  };

  const previewItems = useMemo(
    () => [
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
    ],
    [values, typedPayload.productTitle, typedPayload.productSlug, baseUrl]
  );

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
        <Paper>
          <PaperHeader title="Search Engine Optimization" />
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
        </Paper>

        <Paper>
          <PaperHeader
            title="Open Graph"
            extra={
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Facebook, LinkedIn, etc.
              </Typography.Text>
            }
          />
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
        </Paper>

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
