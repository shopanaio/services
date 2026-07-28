"use client";

import { Alert, App, Button, Input, Typography } from "antd";
import { createStyles } from "antd-style";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ModalHeader,
  ModalLayout,
  useModalStackContext,
} from "@/layouts/modals";
import { Paper } from "@/ui-kit/paper";
import { CodeEditor } from "@/domains/system/email-templates/components";
import { getEmailTemplateVariables } from "../../constants";
import {
  useCreateEmailTemplate,
  useUpdateEmailTemplate,
} from "../../hooks";
import type { EmailTemplateModalPayload } from "../../modals";

interface EmailTemplateFormValues {
  subject: string;
  body: string;
}

const useStyles = createStyles(({ token }) => ({
  form: {
    display: "flex",
    flex: 1,
    flexDirection: "column",
    gap: token.margin,
    minHeight: 0,
  },
  content: {
    boxSizing: "border-box",
    height: "calc(100vh - 112px)",
    maxWidth: 1000,
    marginInline: "auto",
    padding: token.padding,
    width: "100%",
  },
  paper: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
  },
  field: { display: "flex", flexDirection: "column", gap: token.marginXXS },
  editorField: {
    display: "flex",
    flex: 1,
    flexDirection: "column",
    gap: token.marginXXS,
    minHeight: 0,
  },
  editor: {
    flex: 1,
    minHeight: 0,
  },
  label: { fontWeight: 500 },
}));

export const EmailTemplateModal = () => {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const typedPayload = payload as EmailTemplateModalPayload;
  const [showVariables, setShowVariables] = useState(false);
  const createMutation = useCreateEmailTemplate();
  const updateMutation = useUpdateEmailTemplate();
  const activeMutation = typedPayload.template
    ? updateMutation
    : createMutation;
  const {
    control,
    formState: { errors, isDirty },
    handleSubmit,
  } = useForm<EmailTemplateFormValues>({
    defaultValues: {
      subject: typedPayload.template?.subject ?? "",
      body: typedPayload.template?.body ?? "",
    },
  });

  useEffect(() => setDirty(isDirty), [isDirty, setDirty]);

  const submit = handleSubmit(async (values) => {
    const result = typedPayload.template
      ? await updateMutation.updateEmailTemplate({
          id: typedPayload.template.id,
          ...values,
        })
      : await createMutation.createEmailTemplate({
          ...values,
          type: typedPayload.type,
        });
    if (!result.data) return;

    await typedPayload.onSaved?.();
    message.success(
      typedPayload.template ? "Email template updated" : "Email template created",
    );
    forcePop();
  });

  return (
    <ModalLayout
      fullWidth
      name="email-template"
      header={
        <ModalHeader
          extra={
            <Button onClick={() => setShowVariables((current) => !current)}>
              {showVariables ? "Template" : "Variables"}
            </Button>
          }
          name="email-template"
          onClose={pop}
          submitButtonProps={{
            children: "Save",
            disabled: !isDirty,
            loading: activeMutation.loading,
            onClick: submit,
          }}
          title={typedPayload.template ? "Email template" : "New template"}
        />
      }
    >
      {activeMutation.error ? (
        <Alert message={activeMutation.error.message} showIcon type="error" />
      ) : null}
      <div className={styles.content}>
        <Paper className={styles.paper}>
          <div className={styles.form}>
            <div className={styles.field}>
              <Typography.Text className={styles.label}>Subject</Typography.Text>
              <Controller
                control={control}
                name="subject"
                rules={{ required: "Subject is required" }}
                render={({ field }) => (
                  <Input
                    {...field}
                    data-testid="template-subject-input"
                    placeholder="Enter subject"
                    status={errors.subject ? "error" : undefined}
                  />
                )}
              />
              {errors.subject ? (
                <Typography.Text type="danger">
                  {errors.subject.message}
                </Typography.Text>
              ) : null}
            </div>
            <div className={styles.editorField}>
              <Typography.Text className={styles.label}>
                {showVariables ? "Variables" : "Body"}
              </Typography.Text>
              {showVariables ? (
                <div className={styles.editor}>
                  <CodeEditor
                    ariaLabel="Template variables"
                    language="json"
                    onChange={() => {}}
                    readOnly
                    theme="light"
                    value={getEmailTemplateVariables(typedPayload.type)}
                  />
                </div>
              ) : (
                <Controller
                  control={control}
                  name="body"
                  rules={{ required: "Body is required" }}
                  render={({ field }) => (
                    <div className={styles.editor}>
                      <CodeEditor
                        ariaLabel="Email template body"
                        onChange={field.onChange}
                        theme="light"
                        value={field.value}
                      />
                    </div>
                  )}
                />
              )}
              {errors.body && !showVariables ? (
                <Typography.Text type="danger">
                  {errors.body.message}
                </Typography.Text>
              ) : null}
            </div>
          </div>
        </Paper>
      </div>
    </ModalLayout>
  );
};
