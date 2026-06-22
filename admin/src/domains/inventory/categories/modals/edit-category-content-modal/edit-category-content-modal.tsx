"use client";

import { App, Tabs } from "antd";
import type { OutputData } from "@editorjs/editorjs";
import { Controller, useForm } from "react-hook-form";
import {
  ModalHeader,
  ModalLayout,
  useModalStackContext,
} from "@/layouts/modals";
import { Paper } from "@/ui-kit/paper";
import { Editor } from "@/ui-kit/editor";
import { useUpdateCategory } from "../../hooks";
import {
  mapCategoryContentToUpdateInput,
  type CategoryContentFormValues,
} from "../../mappers";
import type { ICategoryEditContentModalPayload } from "../../modals";

function parseEditorData(json: unknown): OutputData | null {
  if (!json) return null;

  try {
    if (typeof json === "string") {
      return JSON.parse(json) as OutputData;
    }
    return json as OutputData;
  } catch {
    return null;
  }
}

export const EditCategoryContentModal = () => {
  const { message } = App.useApp();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as ICategoryEditContentModalPayload;
  const { category, onSaved } = typedPayload;
  const { updateCategory, loading } = useUpdateCategory();

  const { control, handleSubmit } = useForm<CategoryContentFormValues>({
    defaultValues: {
      description: parseEditorData(category.description?.json),
      excerpt: parseEditorData(category.excerpt?.json),
    },
  });

  const onSubmit = async (values: CategoryContentFormValues) => {
    const result = await updateCategory(
      category.id,
      mapCategoryContentToUpdateInput(values),
      category.revision,
    );

    if (result.errors.length > 0) {
      message.error(result.errors[0].message);
      return;
    }

    message.success("Category content updated");
    await onSaved?.();
    pop();
  };

  return (
    <ModalLayout
      name="edit-category-content"
      header={
        <ModalHeader
          name="edit-category-content"
          title="Edit category content"
          onClose={pop}
          submitButtonProps={{
            onClick: handleSubmit(onSubmit),
            loading,
          }}
        />
      }
    >
      <Paper>
        <form>
          <Tabs
            type="card"
            size="middle"
            items={[
              {
                key: "description",
                label: "Description",
                children: (
                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <Editor
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Write category description..."
                        minHeight={250}
                        autofocus
                      />
                    )}
                  />
                ),
              },
              {
                key: "excerpt",
                label: "Excerpt",
                children: (
                  <Controller
                    name="excerpt"
                    control={control}
                    render={({ field }) => (
                      <Editor
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Write a short category excerpt..."
                        minHeight={150}
                      />
                    )}
                  />
                ),
              },
            ]}
          />
        </form>
      </Paper>
    </ModalLayout>
  );
};
