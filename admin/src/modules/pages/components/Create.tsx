import { useCreatePage } from '@modules/pages/hooks/useCreate';
import { DrawerLayout } from '@src/layouts/drawer/components/DrawerLayout';
import { FormProvider, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { defaultFormValues } from '@modules/pages/defs';
import { useEntityDrawer } from '@src/layouts/drawers/hooks/useEntityDrawer';
import { useEffect } from 'react';
import { $drawers } from '@src/layouts/drawers/store/drawers';
import { Information } from '@components/forms/information/Information';
import { getCreatePagePayload } from '@modules/pages/utils/getCreatePayload';
import { Cover } from '@components/forms/cover/Cover';
import { getCreatePageSchema } from '@src/schemas/Page/schema';

export const CreatePage = () => {
  const { uuid } = useEntityDrawer();
  const { createPage } = useCreatePage();

  const methods = useForm({
    resolver: yupResolver(getCreatePageSchema()) as any,
    defaultValues: defaultFormValues,
  });

  const { isDirty } = methods.formState;

  const onSubmit = methods.handleSubmit(
    (data) => {
      createPage(getCreatePagePayload({ data }));
    },
    (errors) => {
      console.error(errors);
    },
  );

  useEffect(() => {
    $drawers.setDirty({ uuid, isDirty });
  }, [uuid, isDirty]);

  return (
    <FormProvider {...methods}>
      <DrawerLayout
        errors={methods.formState.errors}
        headerProps={{
          title: 'Create page',
          submitButtonProps: {
            disabled: !isDirty,
            onClick: onSubmit,
          },
        }}
        leftColumn={[<Information slug="auto" description excerpt />]}
        rightColumn={[<Cover />]}
      />
    </FormProvider>
  );
};
