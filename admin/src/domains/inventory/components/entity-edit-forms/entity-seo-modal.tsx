"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Flex, Input, Typography } from "antd";
import { ModalHeader, ModalLayout } from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { SeoPreview } from "@/domains/inventory/components/entity-details-sections";
import { useEntityEditFormStyles } from "./entity-edit-forms.styles";
import {
  OG_DESCRIPTION_MAX,
  OG_TITLE_MAX,
  SEO_DESCRIPTION_MAX,
  SEO_TITLE_MAX,
} from "./constants";
import { FormField } from "./form-field";
import { ImageUpload } from "./image-upload";
import type {
  EntityEditSubmitResult,
  EntitySeoFormValues,
  EntitySeoSubmitHelpers,
} from "./types";

interface EntitySeoModalProps {
  name: string;
  title: string;
  initialValues: EntitySeoFormValues;
  entityTitle: string;
  entitySlug: string;
  previewPath: string;
  baseUrl?: string;
  metaTitleTestId: string;
  metaDescriptionTestId: string;
  ogTitleTestId: string;
  ogDescriptionTestId: string;
  onClose: () => void;
  onSubmit: (
    values: EntitySeoFormValues,
    helpers: EntitySeoSubmitHelpers,
  ) => EntityEditSubmitResult;
}

export const EntitySeoModal = ({
  name,
  title,
  initialValues,
  entityTitle,
  entitySlug,
  previewPath,
  baseUrl,
  metaTitleTestId,
  metaDescriptionTestId,
  ogTitleTestId,
  ogDescriptionTestId,
  onClose,
  onSubmit,
}: EntitySeoModalProps) => {
  const { styles } = useEntityEditFormStyles();
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = useForm<EntitySeoFormValues>({
    defaultValues: initialValues,
  });

  const values = watch();

  const submit = async (formValues: EntitySeoFormValues) => {
    setSubmitting(true);

    try {
      const result = await onSubmit(formValues, { setError });

      if (result !== false) {
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalLayout
      name={name}
      header={
        <ModalHeader
          name={name}
          title={title}
          onClose={onClose}
          submitButtonProps={{
            onClick: handleSubmit(submit),
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
                  placeholder={entityTitle || "Enter meta title"}
                  maxLength={SEO_TITLE_MAX}
                  showCount
                  status={errors.seoTitle ? "error" : undefined}
                  data-testid={metaTitleTestId}
                />
              )}
            />
            {errors.seoTitle && (
              <Typography.Text type="danger">
                {errors.seoTitle.message}
              </Typography.Text>
            )}
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
                  status={errors.seoDescription ? "error" : undefined}
                  data-testid={metaDescriptionTestId}
                />
              )}
            />
            {errors.seoDescription && (
              <Typography.Text type="danger">
                {errors.seoDescription.message}
              </Typography.Text>
            )}
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
                  status={errors.ogTitle ? "error" : undefined}
                  data-testid={ogTitleTestId}
                />
              )}
            />
            {errors.ogTitle && (
              <Typography.Text type="danger">
                {errors.ogTitle.message}
              </Typography.Text>
            )}
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
                  status={errors.ogDescription ? "error" : undefined}
                  data-testid={ogDescriptionTestId}
                />
              )}
            />
            {errors.ogDescription && (
              <Typography.Text type="danger">
                {errors.ogDescription.message}
              </Typography.Text>
            )}
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
              title: entityTitle,
              slug: entitySlug,
              baseUrl,
              resourcePath: previewPath,
            }}
          />
        </Paper>
      </Flex>
    </ModalLayout>
  );
};
