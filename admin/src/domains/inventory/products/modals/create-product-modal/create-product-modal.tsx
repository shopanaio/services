"use client";

import { useCallback } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { App } from "antd";
import { createStyles } from "antd-style";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { useCreateProduct } from "../../hooks";
import type { ICreateProductFormValues } from "./types";
import { createProductSchema } from "./schema";
import { GeneralSection } from "./general-section";
import { MediaSection } from "./media-section";
import { VariantsSection } from "./variants-section";
import { mapProductUserErrorsToFormErrors } from "../../mappers";

const useStyles = createStyles(() => ({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
}));

const DEFAULT_VALUES: ICreateProductFormValues = {
  title: "",
  handle: "",
  description: null,
  media: [],
  hasVariants: false,
  options: [],
  variants: [],
};

export const CreateProductModal = () => {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { pop } = useModalStackContext();
  const { createProduct, loading: isSubmitting } = useCreateProduct();

  const methods = useForm<ICreateProductFormValues>({
    resolver: zodResolver(createProductSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const { handleSubmit, setError } = methods;

  const onSubmit = useCallback(
    async (data: ICreateProductFormValues) => {
      const { product, userErrors } = await createProduct({
        title: data.title,
        handle: data.handle,
        description: data.description,
        media: data.media,
        hasVariants: data.hasVariants,
        options: data.options,
        variants: data.variants,
      });

      if (userErrors.length > 0) {
        mapProductUserErrorsToFormErrors(userErrors).forEach((error) => {
          setError(error.field, { message: error.message });
        });

        message.error(userErrors[0].message);
        return;
      }

      if (product) {
        message.success("Product created successfully");
        pop();
      }
    },
    [createProduct, setError, message, pop]
  );

  const handleClose = useCallback(() => {
    pop();
  }, [pop]);

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
