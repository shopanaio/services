import { Organization } from '@modules/categories/components/Organization';
import { ModalLayout } from '@src/layouts/modal/components/ModalLayout';
import { FormProvider, useForm } from 'react-hook-form';
import { getEditCategorySchema } from '@src/schemas/Category/schema';
import { useEffect, useRef, useState } from 'react';
import { defaultFormValues } from '@modules/categories/defs';
import { useEntityDrawer } from '@src/layouts/drawers/hooks/useEntityDrawer';
import { ICategory } from '@src/entity/Category/Category';
import { Information } from '@components/forms/information/Information';
import { useUpdateCategory } from '@modules/categories/hooks/useUpdateCategory';
import { getCategoryFormValues } from '@modules/categories/utils/getCategoryFormValues';
import { getEditCategoryPayload } from '@modules/categories/utils/getEditCategoryPayload';
import { $drawers } from '@src/layouts/drawers/store/drawers';
import { Entity } from '@src/defs/entities';
import { useCheckSlug } from '@src/modules/shared/hooks/useCheckSlug';
import { resolveSchema } from '@modules/products/utils/resolveSchema';
import { notify } from '@components/feedback/notification';
import { LayoutSkeleton } from '@src/layouts/table/components/Skeleton';
import { entityStatuses } from '@src/defs/constants';
import { EntryStatusAndInfo } from '@components/forms/EntryStatusAndInfo';
import { useFetchCategory } from '@modules/categories/hooks/useCategpry';
import { ListingSortSettings } from '@modules/categories/components/Products/ListingSort';
import { Listing } from '@modules/categories/components/Products/Listing';
import { EntityMedia } from '@components/forms/media/Media';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';
import {
  IDescriptionFields,
  getApiRichTextJSON,
} from '@src/entity/Content/description';
import { ApiUpdateCategoryInput } from '@src/graphql';

export const CategoryForm = () => {
  const { entityId, uuid, forceClose } = useEntityDrawer();
  const { formatMessage } = useIntl();

  if (!entityId) {
    throw new Error('Entity id is required');
  }

  const shouldClose = useRef(false);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<ICategory | null>(null);
  const [errors, setErrors] = useState({});

  const fetchCategory = useFetchCategory({ id: entityId as ID });
  const { checkSlug } = useCheckSlug(Entity.Category);
  const { updateCategory } = useUpdateCategory();

  const methods = useForm({
    defaultValues: defaultFormValues,
  });

  const { reset, formState } = methods;
  const { dirtyFields, isDirty } = formState;

  useEffect(() => {
    fetchCategory()
      .then((fetchedCategory) => {
        setCategory(fetchedCategory);
        reset(getCategoryFormValues(fetchedCategory));
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

  useEffect(() => {
    $drawers.setDirty({ uuid, isDirty });
  }, [uuid, isDirty]);

  const onSubmit = methods.handleSubmit(async (data) => {
    if (dirtyFields.slug && !(await checkSlug(data.slug))) {
      setErrors({
        slug: formatMessage({ id: t('category.form.slugExists') }),
      });

      return;
    }

    const errors = await resolveSchema(getEditCategorySchema(), { ...data });
    setErrors(errors);
    if (Object.keys(errors).length) {
      return;
    }

    try {
      setLoading(true);
      await updateCategory(
        getEditCategoryPayload({ data, dirtyFields, id: entityId as ID }),
      );
      const updatedCategory = await fetchCategory();
      notify.success(formatMessage({ id: t('category.form.updated') }));
      if (shouldClose.current) {
        forceClose?.();
        return;
      }
      setCategory(updatedCategory);
      reset(getCategoryFormValues(updatedCategory));
      setLoading(false);
    } catch (e) {
      notify.error((e as Error).message);
      setLoading(false);
      shouldClose.current = false;
    }
  });

  if (!category || loading) {
    return <LayoutSkeleton filters={false} />;
  }

  const onDescriptionSave = async (fields: IDescriptionFields | null) => {
    try {
      setLoading(true);
      const payload: ApiUpdateCategoryInput = {
        id: category.id,
        description: getApiRichTextJSON(fields),
      };
      await updateCategory(payload);
      const updatedCategory = await fetchCategory();
      setCategory(updatedCategory);
      reset(getCategoryFormValues(updatedCategory));
    } catch (e) {
      notify.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <ModalLayout
        name="category"
        errors={errors}
        headerProps={{
          title:
            category?.title ||
            formatMessage({ id: t('category.form.editTitle') }),
          statusSelectProps: null,
          onSubmitAndExit: () => {
            shouldClose.current = true;
            onSubmit();
          },
          submitButtonProps: {
            disabled: !isDirty,
            onClick: onSubmit,
          },
        }}
        leftColumn={
          <>
            <Information
              slug="custom"
              description
              onDescriptionSave={onDescriptionSave}
            />
            <EntityMedia />
            <Listing />
          </>
        }
        rightColumn={
          <>
            <EntryStatusAndInfo
              statuses={entityStatuses}
              createdAt={category.createdAt}
              updatedAt={category.updatedAt}
            />
            <ListingSortSettings />
            <Organization />
          </>
        }
      />
    </FormProvider>
  );
};
