"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Tabs } from "antd";
import { ModalHeader, ModalLayout } from "@/layouts/modals";
import { Editor } from "@/ui-kit/editor";
import { Paper } from "@/ui-kit/paper";
import type {
  EntityContentExtraRenderContext,
  EntityContentFormValues,
  EntityEditSubmitResult,
} from "./types";

interface EntityContentModalProps {
  name: string;
  title: string;
  initialValues: EntityContentFormValues;
  descriptionPlaceholder: string;
  excerptPlaceholder: string;
  descriptionTestId?: string;
  excerptTestId?: string;
  onClose: () => void;
  onSubmit: (values: EntityContentFormValues) => EntityEditSubmitResult;
  renderExtraActions?: (context: EntityContentExtraRenderContext) => ReactNode;
}

export const EntityContentModal = ({
  name,
  title,
  initialValues,
  descriptionPlaceholder,
  excerptPlaceholder,
  descriptionTestId,
  excerptTestId,
  onClose,
  onSubmit,
  renderExtraActions,
}: EntityContentModalProps) => {
  const [submitting, setSubmitting] = useState(false);

  const { control, handleSubmit, setValue } =
    useForm<EntityContentFormValues>({
      defaultValues: initialValues,
    });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const submit = async (values: EntityContentFormValues) => {
    setSubmitting(true);

    try {
      const result = await onSubmit(values);

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
      <Paper>
        <form>
          <Tabs
            type="card"
            size="middle"
            tabBarExtraContent={renderExtraActions?.({ setValue })}
            items={[
              {
                key: "description",
                label: "Description",
                forceRender: true,
                children: (
                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <Editor
                        value={field.value}
                        onChange={field.onChange}
                        placeholder={descriptionPlaceholder}
                        minHeight={250}
                        autofocus
                        data-testid={descriptionTestId}
                      />
                    )}
                  />
                ),
              },
              {
                key: "excerpt",
                label: "Excerpt",
                forceRender: true,
                children: (
                  <Controller
                    name="excerpt"
                    control={control}
                    render={({ field }) => (
                      <Editor
                        value={field.value}
                        onChange={field.onChange}
                        placeholder={excerptPlaceholder}
                        minHeight={150}
                        data-testid={excerptTestId}
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
