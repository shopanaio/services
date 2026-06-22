"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Input, Typography } from "antd";
import { slugify } from "transliteration/dist/node/src/node/index.js";
import { ModalHeader, ModalLayout } from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useEntityEditFormStyles } from "./entity-edit-forms.styles";
import type {
  EntityEditSubmitResult,
  EntityIdentityFormValues,
  EntityIdentitySubmitHelpers,
} from "./types";

interface EntityIdentityModalProps {
  name: string;
  title: string;
  sectionTitle: string;
  initialValues: EntityIdentityFormValues;
  primaryLabel: string;
  primaryRequiredMessage: string;
  primaryPlaceholder: string;
  primaryTestId: string;
  handleAddonBefore: string;
  handlePlaceholder: string;
  handleTestId: string;
  handleHelpText: string;
  onClose: () => void;
  onSubmit: (
    values: EntityIdentityFormValues,
    helpers: EntityIdentitySubmitHelpers,
  ) => EntityEditSubmitResult;
}

export const EntityIdentityModal = ({
  name,
  title,
  sectionTitle,
  initialValues,
  primaryLabel,
  primaryRequiredMessage,
  primaryPlaceholder,
  primaryTestId,
  handleAddonBefore,
  handlePlaceholder,
  handleTestId,
  handleHelpText,
  onClose,
  onSubmit,
}: EntityIdentityModalProps) => {
  const { styles } = useEntityEditFormStyles();
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EntityIdentityFormValues>({
    defaultValues: initialValues,
  });

  const titleValue = watch("title");

  useEffect(() => {
    const handle = slugify(titleValue || "");
    setValue("handle", handle);
  }, [titleValue, setValue]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const submit = async (values: EntityIdentityFormValues) => {
    setSubmitting(true);

    try {
      const result = await onSubmit(values, { setError });

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
        <PaperHeader title={sectionTitle} />
        <form>
          <div className={styles.formItem}>
            <Typography.Text strong className={styles.label}>
              {primaryLabel}
            </Typography.Text>
            <Controller
              name="title"
              control={control}
              rules={{ required: primaryRequiredMessage }}
              render={({ field }) => (
                <Input
                  {...field}
                  autoFocus
                  placeholder={primaryPlaceholder}
                  status={errors.title ? "error" : undefined}
                  data-testid={primaryTestId}
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
                  placeholder={handlePlaceholder}
                  addonBefore={handleAddonBefore}
                  status={errors.handle ? "error" : undefined}
                  data-testid={handleTestId}
                />
              )}
            />
            {errors.handle ? (
              <Typography.Text className={styles.error}>
                {errors.handle.message}
              </Typography.Text>
            ) : (
              <Typography.Text className={styles.extra}>
                {handleHelpText}
              </Typography.Text>
            )}
          </div>
        </form>
      </Paper>
    </ModalLayout>
  );
};
