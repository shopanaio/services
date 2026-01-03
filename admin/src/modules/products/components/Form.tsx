import { useEntityDrawer } from '@src/layouts/drawers/hooks/useEntityDrawer';
import { useFetchProduct } from '@modules/products/hooks/useProduct';
import { notify } from '@components/feedback/notification';
import { useIntl } from 'react-intl';
import { t } from '@modules/products/i18n/messages';
import {
  ModalLayout,
  ModalLayoutGrid,
} from '@src/layouts/modal/components/ModalLayout';
import { FormProvider, useForm } from 'react-hook-form';
import { getEditProductSchema } from '@src/schemas/Product/productSchema';
import { useCallback, useEffect, useRef, useState } from 'react';
import { $drawers } from '@src/layouts/drawers/store/drawers';
import { Information } from '@components/forms/information/Information';
import { Features } from '@modules/products/components/options/Options';
import { IProduct } from '@src/entity/Product/Product';
import { useUpdateProduct } from '@modules/products/hooks/useUpdateProduct';
import { getProductFormValues } from '@modules/products/utils/getProductFormValues';
import {
  getEditProductPayload,
  getUpdateGroupsPayload,
  getUpdateVariantsPayload,
} from '@modules/products/utils/getEditProductPayload';
import { resolveSchema } from '@modules/products/utils/resolveSchema';
import { defaultProductFormValues } from '@modules/products/defs';
import { useCheckSlug } from '@src/modules/shared/hooks/useCheckSlug';
import { Entity } from '@src/defs/entities';
import { ProductGroups } from '@modules/products/components/groups/Groups';
import { EntryStatusAndInfo } from '@components/forms/EntryStatusAndInfo';
import { entityStatuses } from '@src/defs/constants';
import { Tags } from '@components/forms/tags/Tags';
import {
  IProductFormValues,
  IProductFormVariantValues,
} from '@modules/products/types';
import { equalsId } from '@src/utils/utils';
import { CategoriesTags } from '@modules/products/components/CategoriesTags';
import {
  ProductFeature,
  IProductFeatureGroup,
} from '@src/entity/Product/ProductFeature';
import { createDefaultVariant } from '@modules/products/utils/createDefaultVariant';
import { partition } from 'lodash';
import { getVariantSlug } from '@modules/products/utils/getSlug';
import { isSyntheticId } from '@src/utils/synthetic-id';
import { compareVariants } from '@modules/products/utils/variants/compareVariants';
import { createVariantsByOptions } from '@modules/products/utils/variants/createVariantsByOptions';
import { getNextAttributes } from '@modules/products/utils/variants/getAttributes';
import { finalVariantsSort } from '@modules/products/utils/variants/mapVariants';
import { ProductVariantsTable } from '@modules/products/components/variants/TableV2';
import { IProductGroupFormValues } from '@modules/products/components/groups/schema';
import { Button } from 'antd';
import { Flex } from '@components/utility/Flex';
import {
  DisabledVariantFields,
  VariantFields,
} from '@modules/products/components/VariantFields';
import {
  IDescriptionFields,
  getApiRichTextJSON,
} from '@src/entity/Content/description';
import { ApiUpdateProductInput } from '@src/graphql';
import { ProductInfoCardA } from '@modules/products/components/ProductInfoCardA';
import { CloseOutlined } from '@ant-design/icons';
import { css } from '@emotion/react';

type ModalTab = 'general' | 'inventory' | 'bundles';

const ProductFormView = () => {
  const intl = useIntl();
  const { uuid, entityId, forceClose } = useEntityDrawer();
  if (!entityId) {
    throw new Error('Entity id is required');
  }

  const [modalTab, setModalTab] = useState<ModalTab>('general');
  const [activeTab, setActiveTab] = useState<
    'general' | 'options' | 'components'
  >('general');

  const shouldClose = useRef(false);
  const [product, setProduct] = useState<IProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [refetching, setRefetching] = useState({
    attributes: false,
    options: false,
    groups: false,
  });
  const [errors, setErrors] = useState({});

  const fetchProduct = useFetchProduct({ id: entityId as ID });
  const { updateProduct } = useUpdateProduct();
  const { checkSlug } = useCheckSlug(Entity.ProdContainer);

  const methods = useForm({
    defaultValues: defaultProductFormValues,
  });

  const { formState, reset, getValues, setValue } = methods;
  const { dirtyFields } = formState;
  const isDirty = Object.keys(dirtyFields).length > 0;

  useEffect(() => {
    $drawers.setDirty({ uuid, isDirty });
  }, [uuid, isDirty]);

  // ===============================
  // Fetch and reset variants
  // ===============================
  const fetchAndResetVariants = useCallback(
    async (
      updatedId: ID | null = null,
      values: IProductFormValues = getValues(),
    ) => {
      const updatedProduct = await fetchProduct();
      setProduct(updatedProduct);
      const updatedFormValues = getProductFormValues(updatedProduct);
      reset({
        ...values,
        variants: updatedId
          ? values.variants.map((it) =>
              it.id === updatedId
                ? updatedFormValues.variants.find(equalsId(updatedId))
                : it,
            )
          : updatedFormValues.variants,
        options: updatedFormValues.options,
        attributes: updatedFormValues.attributes,
      });
    },
    [fetchProduct, reset, getValues],
  );

  // ===============================
  // Fetch and reset
  // ===============================
  const fetchAndResetProduct = useCallback(async () => {
    const updatedProduct = await fetchProduct();
    setProduct(updatedProduct);
    reset(getProductFormValues(updatedProduct));
  }, [fetchProduct, reset]);

  useEffect(() => {
    fetchProduct()
      .then((fetchedProduct) => {
        setProduct(fetchedProduct);
        reset(getProductFormValues(fetchedProduct));
      })
      .catch((error) => {
        notify.error(error.message);
        forceClose?.();
      })
      .finally(() => {
        setLoading(false);
      });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!product || loading) {
    return null;
  }

  const onSubmit = methods.handleSubmit(
    async (data) => {
      if (dirtyFields.slug && !(await checkSlug(data.slug))) {
        setErrors({
          slug: intl.formatMessage({
            id: t('products.form.slugExists'),
          }),
        });
        return;
      }

      const errors = await resolveSchema(getEditProductSchema(), { ...data });

      setErrors(errors);
      if (Object.keys(errors).length) {
        return;
      }

      try {
        setLoading(true);
        const payload = getEditProductPayload({ data, dirtyFields, product });
        await updateProduct(payload);
        notify.success(
          intl.formatMessage({
            id: t('products.form.updated'),
          }),
        );
        if (shouldClose.current) {
          forceClose?.();
          return;
        }
        const updatedProduct = await fetchProduct();
        setProduct(updatedProduct);
        reset(getProductFormValues(updatedProduct));
        setLoading(false);
      } catch (e) {
        notify.error((e as Error).message);
        setLoading(false);
        shouldClose.current = false;
      }
    },
    (errors) => {
      console.error(errors);
    },
  );

  // ===============================
  // Change attributes
  // ===============================
  const _onSubmitFeature = (
    initialRecordId: ID,
    option: IProductFeatureGroup,
  ) => {
    const { isEditing: _, ...rest } = option;
    const value = getValues('attributes');

    const onChange = (value: any) => {
      setValue('attributes', value, { shouldDirty: true });
    };

    if (isSyntheticId(initialRecordId)) {
      onChange([...value.filter((it) => it.id !== initialRecordId), rest]);
      return;
    }

    onChange(
      value.map((it: any) => {
        if (it.id !== option.id) {
          return it;
        }

        return rest;
      }),
    );
  };

  // ===============================
  // Delete attribute
  // ===============================
  const _onDeleteFeature = (id: ID) => {
    setValue(
      'attributes',
      getValues('attributes').filter((it) => it.id !== id),
      { shouldDirty: true },
    );
  };

  // ===============================
  // Sort attributes
  // ===============================
  const _onSortFeatures = (items: IProductFeatureGroup[]) => {
    setValue('attributes', items, { shouldDirty: true });
  };

  // ===============================
  // Change option (Add/Update/Delete)
  // ===============================
  const onSubmitOption = async (
    initialRecordId: ID,
    option: IProductFeatureGroup,
  ) => {
    const { isEditing: _, ...rest } = option;

    // Current form values.
    const formValues = getValues();

    // TODO: Create option payload
    // Create variations payload
    const options = getValues('options') as IProductFeatureGroup[];
    const [...productVariants] = product.variants;

    // Options already in the db. We need to update product links.
    const nextOptions = [
      ...options.map((it) => (it.id === initialRecordId ? rest : it)),
    ] as IProductFeatureGroup[];

    const flatOptions = ProductFeature.flattenFeatures(nextOptions);

    // Already existing variants will be populated with the new options.
    const existingVariants = [] as IProductFormVariantValues[];
    // There variants should be deleted.
    const variantsToDelete = [] as IProductFormVariantValues[];
    // All new combinations. Only the new combinations is being kept.
    const allCombinations = createVariantsByOptions(flatOptions);

    // Process combinations to split new and existing variants.
    productVariants.forEach((initial: any) => {
      const matchingIdx = allCombinations.findIndex((next: any) =>
        compareVariants({ initial, next }),
      );

      if (matchingIdx !== -1) {
        const [matchingItem] = allCombinations.splice(matchingIdx, 1);
        existingVariants.push({
          ...initial,
          options: matchingItem.options,
        });
      } else {
        // If no match found means that the variant is being deleted.
        variantsToDelete.push(initial);
      }
    });

    const newVariants = allCombinations.map((it) => ({
      ...createDefaultVariant(),
      options: it.options,
      _isNew: true,
    }));

    const sortedVariants = finalVariantsSort(
      [...newVariants, ...existingVariants],
      nextOptions,
    ).map((it, idx) => ({
      ...it,
      variantSortIndex: idx,
      slug: getVariantSlug(formValues.slug, it.options),
    }));

    const [create, update] = partition(
      sortedVariants as any[],
      (it: any) => it._isNew,
    );

    // Attributes are being populated with new options
    const nextAttributes = getNextAttributes(
      formValues.attributes, // Merge option to attribute
      nextOptions,
    );

    const payload = getUpdateVariantsPayload({
      formValues: {
        ...getValues(),
        attributes: nextAttributes,
      },
      variants: {
        create: create as IProductFormVariantValues[],
        update: update as IProductFormVariantValues[],
        delete:
          // We need to clear the default variant.
          // TODO: Update an embed variant instead of deletion.
          productVariants.length === 0
            ? [product.embedVariant as IProductFormVariantValues]
            : variantsToDelete,
      },
      product,
    });

    setRefetching((prev) => ({ ...prev, options: true }));
    try {
      await updateProduct(payload);
      await fetchAndResetVariants(null, formValues);
      notify.success(
        intl.formatMessage({
          id: t('products.form.optionsVariantsUpdated'),
        }),
      );
    } finally {
      setRefetching((prev) => ({ ...prev, options: false }));
    }
  };

  // ===============================
  // Delete option
  // ===============================
  const onDeleteOption = async (id: ID) => {
    // Current form values.
    const formValues = getValues();

    // TODO: Create option payload
    // Create variations payload
    const [...productVariants] = product.variants;

    // Options already in the db. We need to update product links.
    const nextOptions = [
      ...formValues.options.filter((it) => it.id !== id),
    ] as IProductFeatureGroup[];

    // Already existing variants will be populated with the new options.
    const existingVariants = [] as IProductFormVariantValues[];
    // There variants should be deleted.
    const variantsToDelete = [] as IProductFormVariantValues[];
    // All combinations.
    const flatOptions = ProductFeature.flattenFeatures(nextOptions);
    const allCombinations = createVariantsByOptions(flatOptions);

    // Process combinations to split deleted and existing variants.
    productVariants.forEach((initial: any) => {
      const matchingIdx = allCombinations.findIndex((next: any) =>
        compareVariants({ initial, next }),
      );

      if (matchingIdx !== -1) {
        const [matchingItem] = allCombinations.splice(matchingIdx, 1);
        existingVariants.push({
          ...initial,
          options: matchingItem.options,
        });
      } else {
        // If no match found means that the variant is being deleted.
        variantsToDelete.push(initial);
      }
    });

    const updated = existingVariants.map((it, idx) => ({
      ...it,
      variantSortIndex: idx,
      slug: getVariantSlug(formValues.slug, it.options),
    }));

    // Attributes are being populated with new options
    const nextAttributes = getNextAttributes(
      formValues.attributes,
      nextOptions,
    );

    const payload = getUpdateVariantsPayload({
      formValues: {
        ...getValues(),
        attributes: nextAttributes,
      },
      variants: {
        create:
          // When no variants to update then we need to create a new embed variant
          updated.length === 0
            ? [
                {
                  // TODO: Fill the embed variant with the default values.
                  ...createDefaultVariant(),
                  options: [],
                  variantSortIndex: 0,
                  slug: getVariantSlug(formValues.slug, []),
                },
              ]
            : [],
        update: updated as IProductFormVariantValues[],
        delete: variantsToDelete as IProductFormVariantValues[],
      },
      product,
    });

    setRefetching((prev) => ({ ...prev, options: true }));
    try {
      await updateProduct(payload);
      await fetchAndResetVariants(null, formValues);
      notify.success(
        intl.formatMessage({
          id: t('products.form.optionsVariantsDeleted'),
        }),
      );
    } finally {
      setRefetching((prev) => ({ ...prev, options: false }));
    }
  };

  // ===============================
  // Sort options
  // ===============================
  const onSortOptions = async (nextOptions: IProductFeatureGroup[]) => {
    const formValues = getValues();
    const { attributes } = formValues;

    setValue('options', nextOptions);
    const [...productVariants] = product.variants;

    // Already existing variants. Options order is being changed.
    const existingVariants = [] as IProductFormVariantValues[];

    // All combinations.
    const flatOptions = ProductFeature.flattenFeatures(nextOptions);
    const allCombinations = createVariantsByOptions(flatOptions);

    // Process combinations to change options order.
    productVariants.forEach((initial: any) => {
      const matchingIdx = allCombinations.findIndex((next: any) =>
        compareVariants({ initial, next }),
      );

      if (matchingIdx !== -1) {
        const [matchingItem] = allCombinations.splice(matchingIdx, 1);
        existingVariants.push({
          ...initial,
          options: matchingItem.options,
        });
      }
    });

    if (existingVariants.length !== productVariants.length) {
      notify.error(
        intl.formatMessage({
          id: t('products.form.optionsOrderError'),
        }),
      );
      throw new Error('Incorrect options order.');
    }

    // Sort variants by options.
    const sortedVariants = finalVariantsSort(existingVariants, nextOptions).map(
      (it, idx) => ({ ...it, variantSortIndex: idx }),
    );

    // Attributes are being populated with new options
    const nextAttributes = getNextAttributes(attributes, nextOptions);
    const payload = getUpdateVariantsPayload({
      formValues: {
        ...getValues(),
        attributes: nextAttributes,
      },
      variants: {
        create: [],
        update: sortedVariants as IProductFormVariantValues[],
        delete: [],
      },
      product,
    });

    setRefetching((prev) => ({ ...prev, options: true }));
    try {
      await updateProduct(payload);
      await fetchAndResetVariants(null, formValues);
      notify.success(
        intl.formatMessage({
          id: t('products.form.optionsReordered'),
        }),
      );
    } finally {
      setRefetching((prev) => ({ ...prev, options: false }));
    }
  };

  // ===============================
  // Watch groups changes
  // ===============================
  const onGroupsChange = async (groups: IProductGroupFormValues[]) => {
    setRefetching((prev) => ({ ...prev, groups: true }));
    try {
      const payload = getUpdateGroupsPayload({ groups, product });
      await updateProduct(payload);
      await fetchAndResetProduct();
      notify.success(
        intl.formatMessage({
          id: t('products.form.componentsUpdated'),
        }),
      );
    } catch (error) {
      notify.error(
        intl.formatMessage({
          id: t('products.form.componentsUpdateFailed'),
        }),
      );
    } finally {
      setRefetching((prev) => ({ ...prev, groups: false }));
    }
  };

  const onDeleteGroup = async (id: ID) => {
    try {
      setRefetching((prev) => ({ ...prev, groups: true }));
      const payload = getUpdateGroupsPayload({
        groups: product.groups.filter((it) => it.id !== id),
        product,
      });
      await updateProduct(payload);
      await fetchAndResetProduct();
      notify.success(
        intl.formatMessage({
          id: t('products.form.componentDeleted'),
        }),
      );
    } catch (error) {
      notify.error(
        intl.formatMessage({
          id: t('products.form.componentDeleteFailed'),
        }),
      );
    } finally {
      setRefetching((prev) => ({ ...prev, groups: false }));
    }
  };

  const onSortGroups = async (groups: IProductGroupFormValues[]) => {
    try {
      setValue('groups', groups);
      setRefetching((prev) => ({ ...prev, groups: true }));
      const payload = getUpdateGroupsPayload({ groups, product });
      await updateProduct(payload);
      await fetchAndResetProduct();
      notify.success(
        intl.formatMessage({
          id: t('products.form.componentsReordered'),
        }),
      );
    } catch (error) {
      notify.error(
        intl.formatMessage({
          id: 'products.form.componentsSortFailed',
        }),
      );
    } finally {
      setRefetching((prev) => ({ ...prev, groups: false }));
    }
  };

  // ===============================
  // Save description (rich text)
  // ===============================
  const onDescriptionSave = async (fields: IDescriptionFields | null) => {
    try {
      setLoading(true);
      const payload: ApiUpdateProductInput = {
        id: product.id,
        description: getApiRichTextJSON(fields),
      };
      await updateProduct(payload);
      await fetchAndResetProduct();
    } catch (error) {
      notify.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const modalTabs: { key: ModalTab; label: string }[] = [
    { key: 'general', label: 'General' },
    { key: 'inventory', label: 'Inventory' },
    { key: 'bundles', label: 'Bundles' },
  ];

  const renderTitle = () => (
    <Flex align="center" css={css`height: 100%;`}>
      {modalTabs.map((tab) => (
        <Button
          key={tab.key}
          type="text"
          color="default"
          onClick={() => setModalTab(tab.key)}
          css={css`
            height: 100%;
            min-width: 120px;
            border-radius: 0;
            font-weight: ${modalTab === tab.key ? 500 : 400};
            color: ${modalTab === tab.key ? 'var(--color-primary)' : 'inherit'};
            background: ${modalTab === tab.key ? 'var(--color-gray-3)' : 'transparent'};
            border-right: 1px solid var(--color-gray-4);
          `}
        >
          {tab.label}
        </Button>
      ))}
    </Flex>
  );

  const renderCloseButton = () => (
    <Button
      type="text"
      icon={<CloseOutlined />}
      onClick={forceClose}
      css={css`
        color: var(--color-gray-7);
        &:hover {
          color: var(--color-gray-9);
          background: var(--color-gray-2);
        }
      `}
    />
  );

  const renderProductInfoCard = () => (
    <ProductInfoCardA product={product} />
  );

  const refetch = (id: ID) => {
    fetchAndResetVariants(id);
  };

  const renderContent = () => {
    switch (modalTab) {
      case 'general':
        return renderProductInfoCard();
      case 'inventory':
        return <ProductVariantsTable refetch={refetch} />;
      case 'bundles':
        return (
          <ProductGroups
            onDone={onGroupsChange}
            loading={refetching.groups}
            onDelete={onDeleteGroup}
            onSort={onSortGroups}
          />
        );
      default:
        return renderProductInfoCard();
    }
  };

  return (
    <FormProvider {...methods}>
      <ModalLayout
        name="product"
        errors={errors}
        fullWidth={modalTab === 'inventory'}
        headerProps={{
          title: renderTitle(),
          rawTitle: true,
          extra: renderCloseButton(),
          submitButtonProps: null,
        }}
      >
        {renderContent()}
      </ModalLayout>
    </FormProvider>
  );
};

export const ProductForm = () => {
  return <ProductFormView />;
};
