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
import { useCreateCategory } from "../../hooks";
import { mapCategoryUserErrorsToFormErrors } from "../../mappers";
import type { ICreateCategoryModalPayload } from "../../modals";
import { GeneralSection } from "./general-section";
import { MediaSection } from "./media-section";
import { createCategorySchema } from "./schema";
import type { ICreateCategoryFormValues } from "./types";

const useStyles = createStyles(() => ({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
}));

const DEFAULT_VALUES: ICreateCategoryFormValues = {
  name: "",
  handle: "",
  description: null,
  media: [],
};

export const CreateCategoryModal = () => {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as ICreateCategoryModalPayload;
  const { parentId = null, onCreated } = typedPayload;
  const { createCategory, loading: isSubmitting } = useCreateCategory();

  const methods = useForm<ICreateCategoryFormValues>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: DEFAULT_VALUES,
  });

  const { handleSubmit, setError } = methods;

  const onSubmit = useCallback(
    async (data: ICreateCategoryFormValues) => {
      const { category, userErrors } = await createCategory({
        name: data.name,
        handle: data.handle,
        description: data.description,
        media: data.media,
        parentId,
      });

      if (userErrors.length > 0) {
        mapCategoryUserErrorsToFormErrors(userErrors).forEach((error) => {
          setError(error.field, { message: error.message });
        });

        message.error(userErrors[0].message);
        return;
      }

      if (category) {
        message.success("Category created successfully");
        onCreated?.(category);
        pop();
      }
    },
    [createCategory, message, onCreated, parentId, pop, setError],
  );

  const handleClose = useCallback(() => {
    pop();
  }, [pop]);

  return (
    <FormProvider {...methods}>
      <ModalLayout
        name="create-category"
        header={
          <ModalHeader
            name="create-category"
            title="New Category"
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
        </div>
      </ModalLayout>
    </FormProvider>
  );
};
