"use client";

import { useCallback } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { App } from "antd";
import { createStyles } from "antd-style";
import {
  ModalHeader,
  ModalLayout,
  useModalStackContext,
} from "@/layouts/modals";
import { useCreateWarehouse } from "../../hooks";
import { mapWarehouseUserErrorsToFormErrors } from "../../mappers";
import type { IWarehouseCreateModalPayload } from "../index";
import { BehaviorSection } from "./behavior-section";
import { GeneralSection } from "./general-section";
import { createWarehouseSchema } from "./schema";
import type { CreateWarehouseFormValues } from "./types";

const useStyles = createStyles(() => ({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
}));

const DEFAULT_VALUES: CreateWarehouseFormValues = {
  name: "",
  code: "",
  isDefault: false,
};

export function CreateWarehouseModal() {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as IWarehouseCreateModalPayload;
  const { createWarehouse, loading } = useCreateWarehouse();

  const methods = useForm<CreateWarehouseFormValues>({
    resolver: zodResolver(createWarehouseSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const { handleSubmit, setError } = methods;

  const handleClose = useCallback(() => {
    pop();
  }, [pop]);

  const onSubmit = useCallback(
    async (values: CreateWarehouseFormValues) => {
      const { warehouse, userErrors } = await createWarehouse(values, {
        listQueryVariables: typedPayload.listQueryVariables,
      });

      if (userErrors.length > 0) {
        mapWarehouseUserErrorsToFormErrors(userErrors).forEach((error) => {
          setError(error.field, { message: error.message });
        });

        message.error(userErrors[0].message);
        return;
      }

      if (warehouse) {
        message.success("Warehouse created");
        pop();
      }
    },
    [
      createWarehouse,
      message,
      pop,
      setError,
      typedPayload.listQueryVariables,
    ],
  );

  return (
    <FormProvider {...methods}>
      <ModalLayout
        name="create-warehouse"
        header={
          <ModalHeader
            name="create-warehouse"
            title="New Warehouse"
            onClose={handleClose}
            submitButtonProps={{
              onClick: handleSubmit(onSubmit),
              loading,
            }}
          />
        }
      >
        <div className={styles.container}>
          <GeneralSection />
          <BehaviorSection />
        </div>
      </ModalLayout>
    </FormProvider>
  );
}
