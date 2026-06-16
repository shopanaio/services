"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm, Controller, FormProvider } from "react-hook-form";
import { Input, Tooltip } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import { createStyles } from "antd-style";
import { slugify } from "transliteration/dist/node/src/node/index.js";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { Paper } from "@/ui-kit/paper";
import type { ICreateOrganizationModalPayload } from "../../modals";

interface ICreateOrganizationFormValues {
  displayName: string;
  name: string;
}

const useStyles = createStyles(({ token }) => ({
  container: {
    display: "flex",
    flexDirection: "column",
    padding: token.paddingLG,
    background: token.colorBgLayout,
    height: "100%",
  },
  card: {
    padding: token.paddingLG,
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
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
  slugPrefix: {
    color: token.colorTextSecondary,
    userSelect: "none",
  },
}));

const DEFAULT_VALUES: ICreateOrganizationFormValues = {
  displayName: "",
  name: "",
};

export const CreateOrganizationModal = () => {
  const { styles } = useStyles();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as ICreateOrganizationModalPayload;
  const [isSlugManual, setIsSlugManual] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const methods = useForm<ICreateOrganizationFormValues>({
    defaultValues: DEFAULT_VALUES,
  });

  const { control, watch, setValue, handleSubmit } = methods;
  const displayName = watch("displayName");

  // Auto-generate slug from displayName (unless manually edited)
  useEffect(() => {
    if (!isSlugManual && displayName) {
      setValue("name", slugify(displayName));
    }
  }, [displayName, isSlugManual, setValue]);

  const onSubmit = useCallback(
    async (data: ICreateOrganizationFormValues) => {
      setIsSubmitting(true);
      try {
        await typedPayload.onCreate?.({
          name: data.name,
          displayName: data.displayName,
        });
        pop();
      } finally {
        setIsSubmitting(false);
      }
    },
    [typedPayload, pop]
  );

  return (
    <FormProvider {...methods}>
      <ModalLayout
        name="create-organization"
        header={
          <ModalHeader
            name="create-organization"
            title="Create Organization"
            onClose={pop}
            submitButtonProps={{
              onClick: handleSubmit(onSubmit),
              loading: isSubmitting,
              children: "Create",
            }}
          />
        }
        bodyClassName={styles.container}
      >
        <Paper className={styles.card}>
          <div className={styles.fieldGroup}>
            <div className={styles.field}>
              <div className={styles.label}>Organization Name</div>
              <Controller
                name="displayName"
                control={control}
                rules={{
                  required: "Organization name is required",
                  minLength: {
                    value: 2,
                    message: "Name must be at least 2 characters",
                  },
                }}
                render={({ field, fieldState: { error } }) => (
                  <>
                    <Input
                      {...field}
                      placeholder="e.g. My Company"
                      status={error ? "error" : undefined}
                      autoFocus
                    />
                    {error && <div className={styles.error}>{error.message}</div>}
                  </>
                )}
              />
            </div>

            <div className={styles.field}>
              <div className={styles.label}>
                Slug
                <Tooltip title="URL-friendly identifier. Auto-generated from name if left empty.">
                  <InfoCircleOutlined
                    style={{ color: "var(--ant-color-text-secondary)" }}
                  />
                </Tooltip>
              </div>
              <Controller
                name="name"
                control={control}
                rules={{
                  required: "Slug is required",
                  pattern: {
                    value: /^[a-z0-9-]+$/,
                    message: "Slug can only contain lowercase letters, numbers, and hyphens",
                  },
                  minLength: {
                    value: 2,
                    message: "Slug must be at least 2 characters",
                  },
                }}
                render={({ field, fieldState: { error } }) => (
                  <>
                    <Input
                      {...field}
                      placeholder="my-company"
                      status={error ? "error" : undefined}
                      onChange={(e) => {
                        const value = slugify(e.target.value);
                        setIsSlugManual(true);
                        field.onChange(value);
                      }}
                      addonBefore={<span className={styles.slugPrefix}>/workspace/</span>}
                    />
                    {error && <div className={styles.error}>{error.message}</div>}
                  </>
                )}
              />
            </div>
          </div>
        </Paper>
      </ModalLayout>
    </FormProvider>
  );
};
