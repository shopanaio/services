"use client";

import { App, Input, Typography } from "antd";
import { Controller, useForm } from "react-hook-form";
import {
  ModalHeader,
  ModalLayout,
  useModalStackContext,
} from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useUpdateCategory } from "../../hooks";
import {
  mapCategoryIdentityToUpdateInput,
  mapCategoryUserErrorsToFormErrors,
  type CategoryIdentityFormValues,
} from "../../mappers";
import type { ICategoryEditIdentityModalPayload } from "../../modals";

export const EditCategoryIdentityModal = () => {
  const { message } = App.useApp();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as ICategoryEditIdentityModalPayload;
  const { category, onSaved } = typedPayload;
  const { updateCategory, loading } = useUpdateCategory();

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CategoryIdentityFormValues>({
    defaultValues: {
      name: category.name,
      handle: category.handle,
    },
  });

  const onSubmit = async (values: CategoryIdentityFormValues) => {
    const result = await updateCategory(
      category.id,
      mapCategoryIdentityToUpdateInput(values),
      category.revision,
    );

    if (result.errors.length > 0) {
      mapCategoryUserErrorsToFormErrors(result.errors).forEach((error) => {
        if (error.field === "name" || error.field === "handle") {
          setError(error.field, { message: error.message });
        }
      });
      message.error(result.errors[0].message);
      return;
    }

    message.success("Category identity updated");
    await onSaved?.();
    pop();
  };

  return (
    <ModalLayout
      name="edit-category-identity"
      header={
        <ModalHeader
          name="edit-category-identity"
          title="Edit category identity"
          onClose={pop}
          submitButtonProps={{
            onClick: handleSubmit(onSubmit),
            loading,
          }}
        />
      }
    >
      <Paper>
        <PaperHeader title="Identity" />
        <form>
          <div style={{ marginBottom: 16 }}>
            <Typography.Text strong>Name</Typography.Text>
            <Controller
              name="name"
              control={control}
              rules={{ required: "Name is required" }}
              render={({ field }) => (
                <Input
                  {...field}
                  autoFocus
                  placeholder="Audio Equipment"
                  status={errors.name ? "error" : undefined}
                  data-testid="edit-category-identity-name-input"
                />
              )}
            />
            {errors.name && (
              <Typography.Text type="danger">
                {errors.name.message}
              </Typography.Text>
            )}
          </div>

          <div>
            <Typography.Text strong>Handle</Typography.Text>
            <Controller
              name="handle"
              control={control}
              rules={{ required: "Handle is required" }}
              render={({ field }) => (
                <Input
                  {...field}
                  addonBefore="/categories/"
                  placeholder="audio-equipment"
                  status={errors.handle ? "error" : undefined}
                  data-testid="edit-category-identity-handle-input"
                />
              )}
            />
            {errors.handle ? (
              <Typography.Text type="danger">
                {errors.handle.message}
              </Typography.Text>
            ) : (
              <Typography.Text type="secondary">
                URL-friendly category identifier
              </Typography.Text>
            )}
          </div>
        </form>
      </Paper>
    </ModalLayout>
  );
};
