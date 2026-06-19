"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Input, Typography } from "antd";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import type { IProductEditTitleModalPayload } from "../../modals";
import { useStyles } from "./edit-title-modal.styles";
import type { IEditTitleForm } from "./types";

export const EditTitleModal = () => {
  const { styles } = useStyles();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as IProductEditTitleModalPayload;
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<IEditTitleForm>({
    defaultValues: {
      title: typedPayload.title || "",
      handle: typedPayload.handle || "",
    },
  });

  const titleValue = watch("title");

  useEffect(() => {
    const handle = titleValue
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    setValue("handle", handle);
  }, [titleValue, setValue]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        pop();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pop]);

  const onSubmit = async (values: IEditTitleForm) => {
    setSubmitting(true);

    try {
      const result = await typedPayload.onSave?.(values);

      if (result !== false) {
        pop();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalLayout
      name="edit-title"
      header={
        <ModalHeader
          name="edit-title"
          title="Edit Title"
          onClose={pop}
          submitButtonProps={{
            onClick: handleSubmit(onSubmit),
            loading: submitting,
          }}
        />
      }
    >
      <Paper>
        <PaperHeader title="Product Title" />
        <form>
          <div className={styles.formItem}>
            <Typography.Text strong className={styles.label}>
              Title
            </Typography.Text>
            <Controller
              name="title"
              control={control}
              rules={{ required: "Title is required" }}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="Product title"
                  status={errors.title ? "error" : undefined}
                  autoFocus
                />
              )}
            />
            {errors.title && (
              <Typography.Text className={styles.error}>
                {errors.title.message}
              </Typography.Text>
            )}
          </div>

          <div className={styles.formItemLast}>
            <Typography.Text strong className={styles.label}>
              Handle
            </Typography.Text>
            <Controller
              name="handle"
              control={control}
              rules={{ required: "Handle is required" }}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="product-handle"
                  addonBefore="/"
                  status={errors.handle ? "error" : undefined}
                />
              )}
            />
            {errors.handle ? (
              <Typography.Text className={styles.error}>
                {errors.handle.message}
              </Typography.Text>
            ) : (
              <Typography.Text className={styles.extra}>
                URL-friendly identifier for this product
              </Typography.Text>
            )}
          </div>
        </form>
      </Paper>
    </ModalLayout>
  );
};
