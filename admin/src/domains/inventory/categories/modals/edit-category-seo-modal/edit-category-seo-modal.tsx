"use client";

import { App, Flex, Input, Typography } from "antd";
import { Controller, useForm } from "react-hook-form";
import {
  ModalHeader,
  ModalLayout,
  useModalStackContext,
} from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { ImageUpload } from "@/domains/inventory/products/modals/edit-seo-modal/components";
import { useUpdateCategory } from "../../hooks";
import {
  mapCategorySeoToUpdateInput,
  mapCategoryUserErrorsToFormErrors,
  type CategorySeoFormValues,
} from "../../mappers";
import type { ICategoryEditSeoModalPayload } from "../../modals";

export const EditCategorySeoModal = () => {
  const { message } = App.useApp();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as ICategoryEditSeoModalPayload;
  const { category, onSaved } = typedPayload;
  const { updateCategory, loading } = useUpdateCategory();

  const {
    control,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = useForm<CategorySeoFormValues>({
    defaultValues: {
      seoTitle: category.seo?.seoTitle ?? "",
      seoDescription: category.seo?.seoDescription ?? "",
      ogTitle: category.seo?.ogTitle ?? "",
      ogDescription: category.seo?.ogDescription ?? "",
      ogImage: category.seo?.ogImage ?? null,
    },
  });

  const values = watch();
  const previewTitle = values.seoTitle || category.name;
  const previewDescription =
    values.seoDescription || category.excerpt?.text || "No SEO description";

  const onSubmit = async (formValues: CategorySeoFormValues) => {
    const result = await updateCategory(
      category.id,
      mapCategorySeoToUpdateInput(formValues),
      category.revision,
    );

    if (result.errors.length > 0) {
      mapCategoryUserErrorsToFormErrors(result.errors).forEach((error) => {
        if (
          error.field === "seoTitle" ||
          error.field === "seoDescription" ||
          error.field === "ogTitle" ||
          error.field === "ogDescription" ||
          error.field === "ogImage"
        ) {
          setError(error.field, { message: error.message });
        }
      });
      message.error(result.errors[0].message);
      return;
    }

    message.success("Category SEO updated");
    await onSaved?.();
    pop();
  };

  return (
    <ModalLayout
      name="edit-category-seo"
      header={
        <ModalHeader
          name="edit-category-seo"
          title="Edit SEO"
          onClose={pop}
          submitButtonProps={{
            onClick: handleSubmit(onSubmit),
            loading,
          }}
        />
      }
    >
      <Flex vertical gap={16}>
        <Paper>
          <PaperHeader title="Search engine optimization" />
          <Flex vertical gap={12}>
            <div>
              <Typography.Text strong>SEO title</Typography.Text>
              <Controller
                name="seoTitle"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder={category.name}
                    maxLength={70}
                    showCount
                    status={errors.seoTitle ? "error" : undefined}
                  />
                )}
              />
              {errors.seoTitle && (
                <Typography.Text type="danger">
                  {errors.seoTitle.message}
                </Typography.Text>
              )}
            </div>

            <div>
              <Typography.Text strong>SEO description</Typography.Text>
              <Controller
                name="seoDescription"
                control={control}
                render={({ field }) => (
                  <Input.TextArea
                    {...field}
                    placeholder="Describe this category for search results"
                    rows={3}
                    maxLength={160}
                    showCount
                    status={errors.seoDescription ? "error" : undefined}
                  />
                )}
              />
              {errors.seoDescription && (
                <Typography.Text type="danger">
                  {errors.seoDescription.message}
                </Typography.Text>
              )}
            </div>
          </Flex>
        </Paper>

        <Paper>
          <PaperHeader title="Open Graph" />
          <Flex vertical gap={12}>
            <div>
              <Typography.Text strong>OG title</Typography.Text>
              <Controller
                name="ogTitle"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder={values.seoTitle || category.name}
                    maxLength={95}
                    showCount
                    status={errors.ogTitle ? "error" : undefined}
                  />
                )}
              />
            </div>

            <div>
              <Typography.Text strong>OG description</Typography.Text>
              <Controller
                name="ogDescription"
                control={control}
                render={({ field }) => (
                  <Input.TextArea
                    {...field}
                    placeholder={values.seoDescription || category.excerpt?.text}
                    rows={2}
                    maxLength={95}
                    showCount
                    status={errors.ogDescription ? "error" : undefined}
                  />
                )}
              />
            </div>

            <div>
              <Typography.Text strong>OG image</Typography.Text>
              <Controller
                name="ogImage"
                control={control}
                render={({ field }) => (
                  <ImageUpload value={field.value ?? null} onChange={field.onChange} />
                )}
              />
            </div>
          </Flex>
        </Paper>

        <Paper>
          <PaperHeader title="Preview" />
          <Flex vertical gap={4}>
            <Typography.Text style={{ color: "#1a0dab", fontSize: 16 }}>
              {previewTitle}
            </Typography.Text>
            <Typography.Text type="success" style={{ fontSize: 12 }}>
              shopana.store/categories/{category.path || category.handle}
            </Typography.Text>
            <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
              {previewDescription}
            </Typography.Paragraph>
          </Flex>
        </Paper>
      </Flex>
    </ModalLayout>
  );
};
