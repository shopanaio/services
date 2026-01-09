"use client";

import { useState, useCallback } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { message } from "antd";
import { createStyles } from "antd-style";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import type { ICreateProductFormValues } from "./types";
import { createProductSchema } from "./schema";
import { GeneralSection } from "./general-section";
import { MediaSection } from "./media-section";
import { VariantsSection } from "./variants-section";

const useStyles = createStyles(() => ({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: 16,
  },
}));

const DEFAULT_VALUES: ICreateProductFormValues = {
  title: "",
  handle: "",
  description: "",
  media: [],
  hasVariants: false,
  options: [],
  variants: [],
};

export const CreateProductModal = () => {
  const { styles } = useStyles();
  const { pop } = useModalStackContext();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const methods = useForm<ICreateProductFormValues>({
    resolver: zodResolver(createProductSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const { handleSubmit, getValues } = methods;

  const onSubmit = useCallback(
    async (data: ICreateProductFormValues) => {
      setIsSubmitting(true);

      try {
        // TODO: Call actual mutation
        console.log("Creating product:", data);

        message.success("Product created successfully");

        // Clean up object URLs
        data.media.forEach((m) => URL.revokeObjectURL(m.url));

        pop();
      } catch (err) {
        console.error("Failed to create product:", err);
        message.error("Failed to create product");
      } finally {
        setIsSubmitting(false);
      }
    },
    [pop]
  );

  const handleClose = useCallback(() => {
    // Clean up object URLs
    const media = getValues("media");
    media.forEach((m) => URL.revokeObjectURL(m.url));
    pop();
  }, [getValues, pop]);

  return (
    <FormProvider {...methods}>
      <ModalLayout
        name="create-product"
        header={
          <ModalHeader
            name="create-product"
            title="New Product"
            onClose={handleClose}
            submitButtonProps={{
              onClick: handleSubmit(onSubmit),
              loading: isSubmitting,
            }}
          />
        }
      >
        <div className={styles.container}>
          <GeneralSection />
          <MediaSection />
          <VariantsSection />
        </div>
      </ModalLayout>
    </FormProvider>
  );
};
