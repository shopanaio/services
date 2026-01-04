"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { Tabs } from "antd";
import { createStyles } from "antd-style";
import type { OutputData } from "@editorjs/editorjs";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { BlockEditor, renderContent } from "@/ui-kit/BlockEditor";
import { Paper } from "../components/Paper";
import type { IProductEditDescriptionModalPayload } from "../modals";

interface IEditDescriptionForm {
  description: OutputData | null;
  excerpt: OutputData | null;
}

const useStyles = createStyles(() => ({
  tabsContainer: {
    padding: "8px 12px 12px",
  },
}));

export const EditDescriptionModal = () => {
  const { styles } = useStyles();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as IProductEditDescriptionModalPayload;

  const { control, handleSubmit } = useForm<IEditDescriptionForm>({
    defaultValues: {
      description: typedPayload.description || null,
      excerpt: typedPayload.excerpt || null,
    },
  });

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
