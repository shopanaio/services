'use client';

import { useState, useCallback } from 'react';
import { message } from 'antd';
import { createStyles } from 'antd-style';
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from '@/layouts/modals';
import type { ICreateProductFormState } from './types';
import { GeneralSection } from './GeneralSection';
import { MediaSection } from './MediaSection';
import { VariantsSection } from './VariantsSection';

const useStyles = createStyles(() => ({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    padding: 16,
  },
}));

const INITIAL_FORM_STATE: ICreateProductFormState = {
  title: '',
  handle: '',
  description: '',
  media: [],
  hasVariants: false,
  options: [],
  variants: [],
};

export const CreateProductModal = () => {
  const { styles } = useStyles();
  const { pop } = useModalStackContext();

  const [formState, setFormState] = useState<ICreateProductFormState>(INITIAL_FORM_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateFormState = useCallback(
    <K extends keyof ICreateProductFormState>(
      key: K,
      value: ICreateProductFormState[K]
    ) => {
      setFormState((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const validateForm = useCallback((): string | null => {
    if (!formState.title.trim()) {
      return 'Product title is required';
    }

    if (formState.hasVariants) {
      const validOptions = formState.options.filter(
        (opt) => opt.name.trim() && opt.values.length > 0
      );
      if (validOptions.length === 0) {
        return 'Add at least one option with values to create variants';
      }

      const enabledVariants = formState.variants.filter((v) => v.enabled);
      if (enabledVariants.length === 0) {
        return 'Select at least one variant to create';
      }
    }

    return null;
  }, [formState]);

  const handleSubmit = useCallback(async () => {
    const error = validateForm();
    if (error) {
      message.error(error);
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare the payload
      const enabledVariants = formState.hasVariants
        ? formState.variants.filter((v) => v.enabled)
        : [];

      const submitPayload = {
        title: formState.title.trim(),
        handle: formState.handle.trim() || undefined,
        description: formState.description.trim() || undefined,
        status: 'DRAFT' as const,
        media: formState.media.map((m, index) => ({
          file: m.file,
          sortIndex: index,
          isCover: index === 0,
        })),
        options: formState.hasVariants
          ? formState.options
              .filter((opt) => opt.name.trim() && opt.values.length > 0)
              .map((opt) => ({
                name: opt.name.trim(),
                values: opt.values,
              }))
          : [],
        variants: enabledVariants.map((v) => ({
          title: v.title,
          options: v.options,
        })),
      };

      console.log('Creating product with payload:', submitPayload);

      // TODO: Call actual mutation
      // const result = await createProduct(submitPayload);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      message.success('Product created successfully');

      // Clean up object URLs
      formState.media.forEach((m) => URL.revokeObjectURL(m.url));

      pop();
    } catch (err) {
      console.error('Failed to create product:', err);
      message.error('Failed to create product');
    } finally {
      setIsSubmitting(false);
    }
  }, [formState, validateForm, pop]);

  const handleClose = useCallback(() => {
    // Clean up object URLs
    formState.media.forEach((m) => URL.revokeObjectURL(m.url));
    pop();
  }, [formState.media, pop]);

  return (
    <ModalLayout
      name="create-product"
      header={
        <ModalHeader
          name="create-product"
          title="New Product"
          onClose={handleClose}
          submitButtonProps={{
            children: 'Create',
            onClick: handleSubmit,
            loading: isSubmitting,
          }}
        />
      }
    >
      <div className={styles.container}>
        <GeneralSection formState={formState} updateFormState={updateFormState} />
        <MediaSection formState={formState} updateFormState={updateFormState} />
        <VariantsSection formState={formState} updateFormState={updateFormState} />
      </div>
    </ModalLayout>
  );
};
