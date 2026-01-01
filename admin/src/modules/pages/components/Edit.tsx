import {
  ApiPage,
  ApiPageQueryFindOneArgs,
  ApiUpdatePageInput,
} from '@src/graphql';
import { DrawerLayout } from '@src/layouts/drawer/components/DrawerLayout';
import { FormProvider, useForm } from 'react-hook-form';
import { useLazyQuery } from '@apollo/client';
import {
  ApiPageQueryFindOneResponse,
  FindOnePageQuery,
} from '@modules/pages/graphql/findOne';
import { useCallback, useEffect, useRef, useState } from 'react';
import { defaultFormValues } from '@modules/pages/defs';
import { useEntityDrawer } from '@src/layouts/drawers/hooks/useEntityDrawer';
import { IPage, Page } from '@src/entity/Page/Page';
import { Information } from '@components/forms/information/Information';
import { useUpdatePage } from '@modules/pages/hooks/useUpdate';
import { getPageFormValues } from '@modules/pages/utils/getFormValues';
import { getEditPagePayload } from '@modules/pages/utils/getEditPayload';
import { getEditPageSchema } from '@src/schemas/Page/schema';
import { LayoutSkeleton } from '@src/layouts/table/components/Skeleton';
import { EntityMedia } from '@components/forms/media/Media';
import { entityStatuses } from '@src/defs/constants';
import { EntryStatusAndInfo } from '@components/forms/EntryStatusAndInfo';
import { notify } from '@components/feedback/notification';
import { $drawers } from '@src/layouts/drawers/store/drawers';
import { useCheckSlug } from '@src/modules/shared/hooks/useCheckSlug';
import { Entity } from '@src/defs/entities';
import { resolveSchema } from '@modules/products/utils/resolveSchema';
import {
  IDescriptionFields,
  getApiRichTextJSON,
} from '@src/entity/Content/description';

export const EditPage = () => {
  const { updatePage } = useUpdatePage();
  const { entityId, forceClose, uuid } = useEntityDrawer();

  const shouldClose = useRef(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<IPage | null>(null);
  const [errors, setErrors] = useState({});
  const [pageQuery] = useLazyQuery<
    ApiPageQueryFindOneResponse,
    ApiPageQueryFindOneArgs
  >(FindOnePageQuery, {
    fetchPolicy: 'no-cache',
    variables: {
      id: entityId as ID,
    },
  });

  const methods = useForm({
    defaultValues: defaultFormValues,
  });

  const { reset, formState } = methods;
  const { dirtyFields, isDirty } = formState;
  const { checkSlug } = useCheckSlug(Entity.Page);

  const fetchPage = useCallback(async () => {
    const { data } = await pageQuery();

    const page = Page.create(data?.pageQuery?.findOne as ApiPage);
    if (!page) {
      throw new Error('Page not found');
    }
    return page;
  }, [pageQuery]);

  useEffect(() => {
    $drawers.setDirty({ uuid, isDirty });
  }, [uuid, isDirty]);

  useEffect(() => {
    fetchPage()
      .then((fetchedPage) => {
        setPage(fetchedPage);
        reset(getPageFormValues(fetchedPage));
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

  const onSubmit = methods.handleSubmit(async (data) => {
    if (dirtyFields.slug && !(await checkSlug(data.slug))) {
      setErrors({
        slug: 'Page with the same slug already exists',
      });

      return;
    }

    const errors = await resolveSchema(getEditPageSchema(), { ...data });
    setErrors(errors);
    if (Object.keys(errors).length) {
      return;
    }

    try {
      setLoading(true);
      await updatePage(
        getEditPagePayload({ data, dirtyFields, id: entityId as ID }),
      );
      const updatedPage = await fetchPage();
      notify.success('Page updated');
      if (shouldClose.current) {
        forceClose?.();
        return;
      }
      setPage(updatedPage);
      reset(getPageFormValues(updatedPage));
      setLoading(false);
    } catch (e) {
      notify.error((e as Error).message);
      setLoading(false);
      shouldClose.current = false;
    }
  });

  if (!page || loading) {
    return <LayoutSkeleton filters={false} />;
  }

  const onDescriptionSave = async (fields: IDescriptionFields | null) => {
    try {
      setLoading(true);
      const payload: ApiUpdatePageInput = {
        id: page.id,
        description: getApiRichTextJSON(fields),
      };
      await updatePage(payload);
      const updatedPage = await fetchPage();
      setPage(updatedPage);
      reset(getPageFormValues(updatedPage));
    } catch (e) {
      notify.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <DrawerLayout
        errors={errors}
        headerProps={{
          title: page?.title || 'Edit page',
          submitButtonProps: {
            disabled: !isDirty,
            onClick: onSubmit,
          },
          onSubmitAndExit() {
            shouldClose.current = true;
            onSubmit();
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
          </>
        }
        rightColumn={
          <>
            <EntryStatusAndInfo
              statuses={entityStatuses}
              createdAt={page.createdAt}
              updatedAt={page.updatedAt}
            />
          </>
        }
      />
    </FormProvider>
  );
};
