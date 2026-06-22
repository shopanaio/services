"use client";

import { App, Flex, Segmented, Typography } from "antd";
import { Controller, useForm } from "react-hook-form";
import {
  ModalHeader,
  ModalLayout,
  useModalStackContext,
} from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useUpdateCategory } from "../../hooks";
import {
  mapCategoryStatusToUpdateInput,
  type CategoryStatusFormValues,
} from "../../mappers";
import type { ICategoryEditStatusModalPayload } from "../../modals";

export const EditCategoryStatusModal = () => {
  const { message } = App.useApp();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as ICategoryEditStatusModalPayload;
  const { category, onSaved } = typedPayload;
  const { updateCategory, loading } = useUpdateCategory();

  const { control, handleSubmit } = useForm<CategoryStatusFormValues>({
    defaultValues: {
      isPublished: category.isPublished,
    },
  });

  const onSubmit = async (values: CategoryStatusFormValues) => {
    const result = await updateCategory(
      category.id,
      mapCategoryStatusToUpdateInput(values),
      category.revision,
    );

    if (result.errors.length > 0) {
      message.error(result.errors[0].message);
      return;
    }

    message.success("Category status updated");
    await onSaved?.();
    pop();
  };

  return (
    <ModalLayout
      name="edit-category-status"
      header={
        <ModalHeader
          name="edit-category-status"
          title="Change category status"
          onClose={pop}
          submitButtonProps={{
            onClick: handleSubmit(onSubmit),
            loading,
          }}
        />
      }
    >
      <Paper>
        <PaperHeader title="Status" />
        <Flex vertical gap={16}>
          <Controller
            name="isPublished"
            control={control}
            render={({ field }) => (
              <Segmented
                block
                value={field.value ? "published" : "draft"}
                onChange={(value) => field.onChange(value === "published")}
                data-testid="edit-category-status-segmented"
                options={[
                  { label: "Draft", value: "draft" },
                  { label: "Published", value: "published" },
                ]}
              />
            )}
          />
          <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
            Published categories are visible to storefront navigation and
            category pages.
          </Typography.Paragraph>
        </Flex>
      </Paper>
    </ModalLayout>
  );
};
