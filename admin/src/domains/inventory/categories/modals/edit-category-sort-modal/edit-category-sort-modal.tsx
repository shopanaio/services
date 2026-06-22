"use client";

import { App, Flex, Segmented, Select, Typography } from "antd";
import { Controller, useForm } from "react-hook-form";
import {
  ModalHeader,
  ModalLayout,
  useModalStackContext,
} from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { ProductSortBy, SortDirection } from "@/graphql/types";
import { useUpdateCategory } from "../../hooks";
import {
  mapCategorySortToUpdateInput,
  type CategorySortFormValues,
} from "../../mappers";
import type { ICategoryEditSortModalPayload } from "../../modals";

export const EditCategorySortModal = () => {
  const { message } = App.useApp();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as ICategoryEditSortModalPayload;
  const { category, onSaved } = typedPayload;
  const { updateCategory, loading } = useUpdateCategory();

  const { control, handleSubmit } = useForm<CategorySortFormValues>({
    defaultValues: {
      defaultSort: category.defaultSort,
      defaultSortDirection: category.defaultSortDirection,
    },
  });

  const onSubmit = async (values: CategorySortFormValues) => {
    const result = await updateCategory(
      category.id,
      mapCategorySortToUpdateInput(values),
      category.revision,
    );

    if (result.errors.length > 0) {
      message.error(result.errors[0].message);
      return;
    }

    message.success("Category sort updated");
    await onSaved?.();
    pop();
  };

  return (
    <ModalLayout
      name="edit-category-sort"
      header={
        <ModalHeader
          name="edit-category-sort"
          title="Edit product sort"
          onClose={pop}
          submitButtonProps={{
            onClick: handleSubmit(onSubmit),
            loading,
          }}
        />
      }
    >
      <Paper>
        <PaperHeader title="Product listing sort" />
        <Flex vertical gap={16}>
          <div>
            <Typography.Text strong>Default sort</Typography.Text>
            <Controller
              name="defaultSort"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  style={{ width: "100%" }}
                  data-testid="edit-category-sort-default-sort-select"
                  options={[
                    { label: "Manual", value: ProductSortBy.Manual },
                    { label: "Name", value: ProductSortBy.Name },
                    { label: "Newest", value: ProductSortBy.Newest },
                    { label: "Price", value: ProductSortBy.Price },
                  ]}
                />
              )}
            />
          </div>

          <div>
            <Typography.Text strong>Direction</Typography.Text>
            <Controller
              name="defaultSortDirection"
              control={control}
              render={({ field }) => (
                <Segmented
                  block
                  value={field.value}
                  onChange={field.onChange}
                  data-testid="edit-category-sort-direction-segmented"
                  options={[
                    { label: "Ascending", value: SortDirection.Asc },
                    { label: "Descending", value: SortDirection.Desc },
                  ]}
                />
              )}
            />
          </div>
        </Flex>
      </Paper>
    </ModalLayout>
  );
};
