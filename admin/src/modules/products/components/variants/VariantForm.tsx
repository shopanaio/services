import { DrawerLayout } from '@src/layouts/drawer/components/DrawerLayout';
import { FormProvider, useForm } from 'react-hook-form';
import { getEditVariantSchema } from '@src/schemas/Product/productSchema';
import { useEntityDrawer } from '@src/layouts/drawers/hooks/useEntityDrawer';
import { useEffect, useRef, useState } from 'react';
import { $drawers } from '@src/layouts/drawers/store/drawers';
import { Information } from '@components/forms/information/Information';
import { VariantsGroup } from '@modules/products/components/variants/Group';
import { VariantsNav } from '@modules/products/components/variants/Nav';
import { useFetchProduct } from '@modules/products/hooks/useProduct';
import { LayoutSkeleton } from '@src/layouts/table/components/Skeleton';
import { notify } from '@components/feedback/notification';
import { useIntl } from 'react-intl';
import { t } from '@modules/products/i18n/messages';
import { getProductFormValues } from '@modules/products/utils/getProductFormValues';
import { IProduct } from '@src/entity/Product/Product';
import _ from 'lodash';
import { resolveSchema } from '@modules/products/utils/resolveSchema';
import { useCheckSlug } from '@modules/shared/hooks/useCheckSlug';
import { Entity } from '@src/defs/entities';
import { useUpdateProduct } from '@modules/products/hooks/useUpdateProduct';
import {
  IProductFormValues,
  IProductFormVariantValues,
} from '@modules/products/types';
import { IProductVariant } from '@src/entity/Product/Variant';
import { getEditVariantPayload } from '@modules/products/utils/getEditVariantPayload';
import { equalsId } from '@src/utils/utils';
import { VariantFields } from '@modules/products/components/VariantFields';

// This form works with existing variants only.
const VariantFormView = () => {
  const intl = useIntl();
  const {
    uuid,
    entityId: initialId,
    forceClose,
    meta: { formValues, onSubmit: onSubmitVariant },
  } = useEntityDrawer();

  const { id: productId } = formValues as { id: ID };

  // Initially the drawer is being opened with some of the variant id,
  // But it could be switched to another variant, so we need to track the id
  const [id, setId] = useState<ID>(initialId as ID);

  const shouldClose = useRef(false);
  const [product, setProduct] = useState<IProduct | null>(null);
  const [currentVariant, setCurrentVariant] = useState<IProductVariant | null>(
    null,
  );

  const {
    title = '',
    cover = null,
    variants: variantsFormValues = [],
  } = (product || {}) as IProductFormValues;

  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});

  const fetchProduct = useFetchProduct({ id: productId });
  const { updateProduct } = useUpdateProduct();
  const { checkSlug } = useCheckSlug(Entity.ProdVariant);

  const methods = useForm<IProductFormVariantValues>({
    reValidateMode: 'onBlur',
    defaultValues: {} as IProductFormVariantValues,
  });

  const { reset, formState, handleSubmit } = methods;
  const { isDirty, dirtyFields } = formState;
  const variantFormValues = variantsFormValues?.find(equalsId(id));

  useEffect(() => {
    $drawers.setDirty({ uuid, isDirty });
  }, [uuid, isDirty]);

  useEffect(() => {
    if (!product) {
      return;
    }

    const productVariant = product?.variants?.find((it: any) => it.id === id);
    const currentVariant = _.merge(variantFormValues, productVariant);

    reset(currentVariant);
    setCurrentVariant(currentVariant as IProductVariant);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, product]);

  useEffect(() => {
    fetchProduct()
      .then((fetchedProduct) => {
        setProduct(fetchedProduct);
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

  if (!currentVariant || loading) {
    return <LayoutSkeleton filters={false} />;
  }

  const onSubmit = handleSubmit(
    async (data) => {
      if (dirtyFields.slug && !(await checkSlug(data.slug))) {
        setErrors({
          slug: intl.formatMessage({
            id: t('products.variant.form.slugExists'),
          }),
        });
        return;
      }

      const errors = await resolveSchema(getEditVariantSchema(), { ...data });

      setErrors(errors);
      if (Object.keys(errors).length) {
        return;
      }

      try {
        setLoading(true);
        const payload = getEditVariantPayload({ data, dirtyFields });
        await updateProduct({
          id: productId,
          variants: {
            create: [],
            update: [payload],
            delete: [],
          },
        });
        notify.success(
          intl.formatMessage({ id: t('products.variant.form.updated') }),
        );
        if (shouldClose.current) {
          onSubmitVariant?.(id);
          forceClose?.();
          return;
        }
        const updatedProduct = await fetchProduct();
        setProduct(updatedProduct);
        reset(getProductFormValues(updatedProduct));
        onSubmitVariant?.(id);
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

  return (
    <FormProvider {...methods}>
      <DrawerLayout
        name="variant"
        errors={errors}
        headerProps={{
          title: (currentVariant?.options || [])
            .map((it: any) => it?.title)
            .join(' ▸ '),
          submitButtonProps: {
            disabled: !isDirty,
            onClick: onSubmit,
          },
          onSubmitAndExit: () => {
            shouldClose.current = true;
            onSubmit();
          },
        }}
        leftColumn={
          <>
            <Information key="info" slug="custom" />
            <VariantFields />
          </>
        }
        rightColumn={[
          <VariantsGroup
            key="group"
            title={
              title || intl.formatMessage({ id: t('product.variant.level') })
            }
            cover={cover}
            variantsCount={variantsFormValues?.length || 0}
          />,
          <VariantsNav
            key="nav"
            variants={variantsFormValues}
            isDirty={isDirty}
            openVariant={async (id, shouldSave) => {
              if (shouldSave) {
                // TODO: Validate the form
                await onSubmit();
              }

              setId(id);
            }}
            activeId={id}
          />,
        ]}
      />
    </FormProvider>
  );
};

export const VariantForm = () => {
  return (
    <VariantFormView />
  );
};
