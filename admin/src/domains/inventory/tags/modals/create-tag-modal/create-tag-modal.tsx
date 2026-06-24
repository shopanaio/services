"use client";

import { useCallback, useEffect, useState } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { App, Input, Tooltip } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import { createStyles } from "antd-style";
import { slugify } from "transliteration/dist/node/src/node/index.js";
import {
  ModalHeader,
  ModalLayout,
  useModalStackContext,
} from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useCreateTag } from "../../hooks";
import {
  mapTagIdentityToCreateInput,
  mapTagUserErrorsToFormErrors,
} from "../../mappers";
import type { ICreateTagModalPayload } from "../../modals";
import { createTagSchema, type CreateTagFormValues } from "./schema";

const useStyles = createStyles(({ token }) => ({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  fieldGroup: {
    display: "flex",
    gap: 16,
    marginBottom: 16,
  },
  field: {
    flex: 1,
  },
  label: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
    fontSize: 13,
    fontWeight: 500,
    color: token.colorText,
  },
  error: {
    fontSize: 12,
    color: token.colorError,
    marginTop: 4,
  },
  handlePrefix: {
    color: token.colorTextSecondary,
    userSelect: "none",
  },
}));

const DEFAULT_VALUES: CreateTagFormValues = {
  name: "",
  handle: "",
};

export const CreateTagModal = () => {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as ICreateTagModalPayload;
  const { onCreated } = typedPayload;
  const { createTag, loading: isSubmitting } = useCreateTag();
  const [isHandleManual, setIsHandleManual] = useState(false);

  const methods = useForm<CreateTagFormValues>({
    resolver: zodResolver(createTagSchema),
    defaultValues: DEFAULT_VALUES,
  });
  const { control, handleSubmit, setError, setValue, watch } = methods;
  const name = watch("name");

  useEffect(() => {
    if (!isHandleManual && name) {
      setValue("handle", slugify(name), { shouldValidate: true });
    }
  }, [isHandleManual, name, setValue]);

  const onSubmit = useCallback(
    async (data: CreateTagFormValues) => {
      const { tag, userErrors } = await createTag(
        mapTagIdentityToCreateInput(data),
      );

      if (userErrors.length > 0) {
        mapTagUserErrorsToFormErrors(userErrors).forEach((error) => {
          if (error.field === "name") {
            setError("name", { message: error.message });
          }
          if (error.field === "handle") {
            setError("handle", { message: error.message });
          }
        });
        message.error(userErrors[0].message);
        return;
      }

      if (tag) {
        message.success("Tag created successfully");
        onCreated?.(tag);
        pop();
      }
    },
    [createTag, message, onCreated, pop, setError],
  );

  return (
    <FormProvider {...methods}>
      <ModalLayout
        name="create-tag"
        header={
          <ModalHeader
            name="create-tag"
            title="New Tag"
            onClose={pop}
            submitButtonProps={{
              onClick: handleSubmit(onSubmit),
              loading: isSubmitting,
            }}
          />
        }
      >
        <div className={styles.container}>
          <Paper>
            <PaperHeader title="General" />
            <div className={styles.fieldGroup}>
              <div className={styles.field}>
                <div className={styles.label}>Name</div>
                <Controller
                  name="name"
                  control={control}
                  render={({ field, fieldState: { error } }) => (
                    <>
                      <Input
                        {...field}
                        autoFocus
                        data-testid="create-tag-name-input"
                        placeholder="e.g. Summer essentials"
                        status={error ? "error" : undefined}
                      />
                      {error && (
                        <div className={styles.error}>{error.message}</div>
                      )}
                    </>
                  )}
                />
              </div>

              <div className={styles.field}>
                <div className={styles.label}>
                  Handle
                  <Tooltip title="URL-friendly identifier. Auto-generated from name if left empty.">
                    <InfoCircleOutlined
                      style={{ color: "var(--ant-color-text-secondary)" }}
                    />
                  </Tooltip>
                </div>
                <Controller
                  name="handle"
                  control={control}
                  render={({ field, fieldState: { error } }) => (
                    <>
                      <Input
                        {...field}
                        data-testid="create-tag-handle-input"
                        placeholder="summer-essentials"
                        status={error ? "error" : undefined}
                        onChange={(e) => {
                          setIsHandleManual(true);
                          field.onChange(slugify(e.target.value));
                        }}
                        addonBefore={
                          <span className={styles.handlePrefix}>#</span>
                        }
                      />
                      {error && (
                        <div className={styles.error}>{error.message}</div>
                      )}
                    </>
                  )}
                />
              </div>
            </div>
          </Paper>
        </div>
      </ModalLayout>
    </FormProvider>
  );
};
