"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Input, Typography, Flex } from "antd";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { SeoPreview } from "../../components/seo";
import type { IEditSeoModalPayload } from "../../modals";
import { useStyles } from "./edit-seo-modal.styles";
import {
  SEO_TITLE_MAX,
  SEO_DESCRIPTION_MAX,
  OG_TITLE_MAX,
  OG_DESCRIPTION_MAX,
} from "./edit-seo-modal.constants";
import { ImageUpload, FormField } from "./components";
import type { ISeoFormValues } from "./types";

export const EditSeoModal = () => {
  const { styles } = useStyles();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as IEditSeoModalPayload;
  const [submitting, setSubmitting] = useState(false);

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

  const onSubmit = async (formValues: ISeoFormValues) => {
    setSubmitting(true);

    try {
      const result = await typedPayload.onSave?.(formValues);

      if (result !== false) {
        pop();
      }
    } finally {
      setSubmitting(false);
    }
  };

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
            loading: submitting,
          }}
        />
      }
    >
      <Flex vertical gap={16}>
        <Paper>
          <PaperHeader title="Search Engine Optimization" />
          <FormField label="Meta Title">
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
          </FormField>
          <FormField label="Meta Description" isLast>
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
          </FormField>
        </Paper>

        <Paper>
          <PaperHeader
            title="Open Graph"
            extra={
              <Typography.Text type="secondary" className={styles.ogExtra}>
                Facebook, LinkedIn, etc.
              </Typography.Text>
            }
          />
          <FormField label="OG Title">
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
          </FormField>
          <FormField label="OG Description">
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
          </FormField>
          <FormField label="OG Image" isLast>
            <Controller
              name="ogImage"
              control={control}
              render={({ field }) => (
                <ImageUpload value={field.value} onChange={field.onChange} />
              )}
            />
          </FormField>
        </Paper>

        <Paper>
          <PaperHeader title="Preview" />
          <SeoPreview
            data={{
              seoTitle: values.seoTitle,
              seoDescription: values.seoDescription,
              ogTitle: values.ogTitle,
              ogDescription: values.ogDescription,
              ogImage: values.ogImage,
              productTitle: typedPayload.productTitle,
              productSlug: typedPayload.productSlug,
              baseUrl,
            }}
          />
        </Paper>
      </Flex>
    </ModalLayout>
  );
};
