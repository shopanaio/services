"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { Tabs } from "antd";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { BlockEditor, renderContent, type RenderedContent } from "@/ui-kit/block-editor";
import { AIButton } from "@/ui-kit/ai-button";
import { Paper } from "../../components/paper";
import type { IProductEditDescriptionModalPayload } from "../../modals";
import { useProductAIWriterModal } from "../../modals";
import { useStyles } from "./edit-description-modal.styles";
import type { IEditDescriptionForm } from "./types";

export const EditDescriptionModal = () => {
  const { styles } = useStyles();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as IProductEditDescriptionModalPayload;
  const { push: openAIWriterModal } = useProductAIWriterModal();

  const { control, handleSubmit, setValue } = useForm<IEditDescriptionForm>({
    defaultValues: {
      description: typedPayload.description || null,
      excerpt: typedPayload.excerpt || null,
    },
  });

  const handleWriteWithAI = () => {
    if (!typedPayload.product) return;
    openAIWriterModal({
      product: typedPayload.product,
      onApply: (values: { description?: RenderedContent; excerpt?: RenderedContent }) => {
        if (values.description?.json) {
          setValue("description", values.description.json);
        }
        if (values.excerpt?.json) {
          setValue("excerpt", values.excerpt.json);
        }
      },
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        pop();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pop]);

  const onSubmit = (values: IEditDescriptionForm) => {
    typedPayload.onSave?.({
      description: renderContent(values.description),
      excerpt: renderContent(values.excerpt),
    });
    pop();
  };

  return (
    <ModalLayout
      name="edit-description"
      header={
        <ModalHeader
          name="edit-description"
          title="Edit Content"
          onClose={pop}
          submitButtonProps={{
            onClick: handleSubmit(onSubmit),
          }}
        />
      }
    >
      <Paper className={styles.tabsContainer}>
        <form>
          <Tabs
            type="card"
            size="middle"
            tabBarExtraContent={
              typedPayload.product ? (
                <AIButton onClick={handleWriteWithAI} />
              ) : null
            }
            items={[
              {
                key: "description",
                label: "Description",
                children: (
                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <BlockEditor
                        value={field.value || undefined}
                        onChange={field.onChange}
                        placeholder="Start writing product description..."
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
                      <BlockEditor
                        value={field.value || undefined}
                        onChange={field.onChange}
                        placeholder="Write a short product excerpt..."
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
