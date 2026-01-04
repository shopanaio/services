"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { Input, Typography, Tabs } from "antd";
import { createStyles } from "antd-style";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { Paper } from "../components/Paper";
import type { IProductEditDescriptionModalPayload } from "../modals";

interface IEditDescriptionForm {
  description: string;
  excerpt: string;
}

const useStyles = createStyles(({ token }) => ({
  tabsContainer: {
    padding: "8px 12px 12px",
  },
  formItem: {
    marginBottom: 0,
  },
  error: {
    color: token.colorError,
    fontSize: token.fontSizeSM,
    marginTop: 4,
  },
  extra: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
    marginTop: 4,
  },
}));

export const EditDescriptionModal = () => {
  const { styles } = useStyles();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as IProductEditDescriptionModalPayload;

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<IEditDescriptionForm>({
    defaultValues: {
      description: typedPayload.description || "",
      excerpt: typedPayload.excerpt || "",
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
    typedPayload.onSave?.(values);
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
                  <div className={styles.formItem}>
                    <Controller
                      name="description"
                      control={control}
                      render={({ field }) => (
                        <Input.TextArea
                          {...field}
                          placeholder="Product description"
                          rows={8}
                          status={errors.description ? "error" : undefined}
                          autoFocus
                        />
                      )}
                    />
                    {errors.description && (
                      <Typography.Text className={styles.error}>
                        {errors.description.message}
                      </Typography.Text>
                    )}
                    <Typography.Text className={styles.extra}>
                      Detailed product description shown on the product page
                    </Typography.Text>
                  </div>
                ),
              },
              {
                key: "excerpt",
                label: "Excerpt",
                children: (
                  <div className={styles.formItem}>
                    <Controller
                      name="excerpt"
                      control={control}
                      render={({ field }) => (
                        <Input.TextArea
                          {...field}
                          placeholder="Short product excerpt"
                          rows={4}
                          status={errors.excerpt ? "error" : undefined}
                        />
                      )}
                    />
                    {errors.excerpt ? (
                      <Typography.Text className={styles.error}>
                        {errors.excerpt.message}
                      </Typography.Text>
                    ) : (
                      <Typography.Text className={styles.extra}>
                        Brief summary used in product listings and search results
                      </Typography.Text>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </form>
      </Paper>
    </ModalLayout>
  );
};
