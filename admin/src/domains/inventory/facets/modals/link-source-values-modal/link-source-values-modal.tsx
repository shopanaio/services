"use client";

import { useCallback } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { App, Select } from "antd";
import { createStyles } from "antd-style";
import {
  ModalHeader,
  ModalLayout,
  useModalStackContext,
} from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { normalizeSourceHandles } from "../../mappers";
import type { ILinkSourceValuesModalPayload } from "../../modals";
import {
  linkSourceValuesSchema,
  type LinkSourceValuesFormValues,
} from "./schema";

const useStyles = createStyles(({ token }) => ({
  error: {
    fontSize: 12,
    color: token.colorError,
    marginTop: 4,
  },
}));

export function LinkSourceValuesModal() {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as ILinkSourceValuesModalPayload;

  const methods = useForm<LinkSourceValuesFormValues>({
    resolver: zodResolver(linkSourceValuesSchema),
    defaultValues: {
      sourceHandles: typedPayload.sourceHandles,
    },
  });
  const { control, handleSubmit, setError } = methods;

  const onSubmit = useCallback(
    async (values: LinkSourceValuesFormValues) => {
      const handles = normalizeSourceHandles(values.sourceHandles);
      if (handles.length === 0) {
        setError("sourceHandles", {
          message: "At least one source handle is required",
        });
        return;
      }

      const accepted = await typedPayload.onSave?.(handles);
      if (accepted === false) {
        return;
      }

      message.success("Source links updated.");
      pop();
    },
    [message, pop, setError, typedPayload],
  );

  return (
    <FormProvider {...methods}>
      <ModalLayout
        name="link-source-values"
        header={
          <ModalHeader
            name="link-source-values"
            title={`Link source values: ${typedPayload.valueLabel}`}
            onClose={pop}
            submitButtonProps={{
              onClick: handleSubmit(onSubmit),
            }}
          />
        }
      >
        <Paper>
          <PaperHeader title="Source handles" />
          <Controller
            name="sourceHandles"
            control={control}
            render={({ field, fieldState: { error } }) => (
              <>
                <Select
                  mode="tags"
                  tokenSeparators={[","]}
                  style={{ width: "100%" }}
                  placeholder="Add source handles"
                  value={field.value}
                  onChange={(values) => field.onChange(values)}
                  status={error ? "error" : undefined}
                />
                {error && <div className={styles.error}>{error.message}</div>}
              </>
            )}
          />
        </Paper>
      </ModalLayout>
    </FormProvider>
  );
}
