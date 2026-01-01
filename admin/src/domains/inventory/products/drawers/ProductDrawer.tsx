'use client';

import { useDrawerContext } from '@/layouts/drawers';
import {
  DrawerLayout,
  DrawerLayoutGrid,
} from '@/layouts/drawer/components/DrawerLayout';
import { DrawerHeader } from '@/layouts/drawer/components/DrawerHeader';
import { FormProvider, useForm } from 'react-hook-form';
import { useCallback, useEffect, useState } from 'react';
import { Information } from '@/components/forms/information/Information';
import { EntryStatusAndInfo } from '@/components/forms/EntryStatusAndInfo';
import { Tags } from '@/components/forms/tags/Tags';
import { CategoriesTags } from '@/domains/inventory/products/components/CategoriesTags';
import {
  DisabledVariantFields,
  VariantFields,
} from '@/domains/inventory/products/components/VariantFields';
import { Flex } from '@/components/utility/Flex';
import { Tabs, Skeleton, message } from 'antd';
import type { ProductDrawerPayload } from './types';
import {
  type IProductFormValues,
  defaultProductFormValues,
} from '@/domains/inventory/products/types';
import { getProductById } from '@/domains/inventory/products/mocks/products';

const ProductFormView = () => {
  const { payload, close, setDirty } = useDrawerContext<ProductDrawerPayload>();
  const entityId = payload.entityId;

  const [activeTab, setActiveTab] = useState<
    'general' | 'options' | 'components'
  >('general');

  const [product, setProduct] = useState<IProductFormValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const methods = useForm<IProductFormValues>({
    defaultValues: defaultProductFormValues,
  });

  const { formState, reset } = methods;
  const { dirtyFields } = formState;
  const isDirty = Object.keys(dirtyFields).length > 0;

  useEffect(() => {
    setDirty?.(isDirty);
  }, [isDirty, setDirty]);

  // Fetch product on mount
  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 300));

      const foundProduct = getProductById(String(entityId));
      if (foundProduct) {
        setProduct(foundProduct);
        reset(foundProduct);
      } else {
        message.error('Product not found');
        close?.();
      }
      setLoading(false);
    };

    fetchProduct();
  }, [entityId, reset, close]);

  const onSubmit = useCallback(
    async (andClose = false) => {
      const data = methods.getValues();

      setSaving(true);
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      // In real app, this would call updateProduct mutation
      console.log('Saving product:', data);

      message.success('Product saved successfully');
      reset(data);
      setSaving(false);

      if (andClose) {
        close?.();
      }
    },
    [methods, reset, close]
  );

  if (loading || !product) {
    return (
      <div style={{ padding: 24 }}>
        <Skeleton active />
        <Skeleton active />
        <Skeleton active />
      </div>
    );
  }

  const isVariableProduct = product.options.length > 0;

  return (
    <FormProvider {...methods}>
      <DrawerHeader
        name="product"
        title={product.title || 'Edit Product'}
        onClose={close}
        onSubmitAndExit={() => onSubmit(true)}
        submitButtonProps={{
          disabled: !isDirty,
          onClick: () => onSubmit(false),
          loading: saving,
        }}
      />
      <DrawerLayout
        name="product"
        leftColumn={
          <Tabs
            type="card"
            size="small"
            activeKey={activeTab}
            onChange={(key) =>
              setActiveTab(key as 'general' | 'options' | 'components')
            }
            items={[
              {
                label: 'General',
                key: 'general',
                children: (
                  <DrawerLayoutGrid
                    aside={
                      <>
                        <EntryStatusAndInfo
                          createdAt={new Date()}
                          updatedAt={new Date()}
                        />
                        <CategoriesTags />
                        <Tags />
                      </>
                    }
                  >
                    <Information slug="custom" description />
                    {isVariableProduct ? (
                      <DisabledVariantFields />
                    ) : (
                      <VariantFields />
                    )}
                  </DrawerLayoutGrid>
                ),
              },
              {
                label: 'Options & Variants',
                key: 'options',
                children: (
                  <Flex direction="column" gap="4">
                    {/* Options and Variants table would go here */}
                    <div style={{ padding: 16, background: 'var(--color-bg-container)', borderRadius: 8 }}>
                      <p>Options: {product.options.length}</p>
                      <p>Variants: {product.variants.length}</p>
                      <p style={{ color: 'var(--color-text-secondary)', marginTop: 8 }}>
                        Options and variants management is not implemented in mock mode.
                      </p>
                    </div>
                  </Flex>
                ),
              },
              {
                label: 'Components',
                key: 'components',
                children: (
                  <Flex direction="column" gap="4">
                    {/* Product groups/bundles would go here */}
                    <div style={{ padding: 16, background: 'var(--color-bg-container)', borderRadius: 8 }}>
                      <p>Groups: {product.groups.length}</p>
                      <p style={{ color: 'var(--color-text-secondary)', marginTop: 8 }}>
                        Components/bundles management is not implemented in mock mode.
                      </p>
                    </div>
                  </Flex>
                ),
              },
            ]}
          />
        }
      />
    </FormProvider>
  );
};

export const ProductDrawer = () => {
  return <ProductFormView />;
};
