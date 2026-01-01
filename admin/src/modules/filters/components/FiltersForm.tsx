import { NavFilters } from '@modules/navigation/components/Filters';
import { IRenderNavigationProps } from '@modules/navigation/components/Navigation';
import { defaultFilterFormValues } from '@modules/navigation/defs';
import { useFilters } from '@modules/navigation/hooks/useFilters';
import { useUpdateFilters } from '@modules/navigation/hooks/useUpdateFilters';
import { IProductFilter } from '@src/entity/ProductFilter/ProductFilter';
import { useInitialDelay } from '@src/hooks/useInitialDelay';
import { PageLayout } from '@src/layouts/page/components/PageLayout';
import { ReactNode, useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

interface IFiltersFormProps {
  tab: string;
  renderNavigation: (props: IRenderNavigationProps) => ReactNode;
}

export const FiltersForm = ({ renderNavigation }: IFiltersFormProps) => {
  const isReady = useInitialDelay();

  const methods = useForm({
    defaultValues: defaultFilterFormValues,
  });

  const { reset, handleSubmit, formState } = methods;
  const { isDirty, errors, dirtyFields } = formState;

  const { updateFilters } = useUpdateFilters();
  const { filters, loading } = useFilters();

  useEffect(() => {
    reset({ filters });
  }, [reset, filters]);

  const onSubmit = handleSubmit(async (data: any) => {
    if (dirtyFields.filters) {
      await updateFilters(
        data.filters.map(({ id }: IProductFilter, idx: number) => ({
          id,
          sortIndex: idx,
        })),
      );
      reset({ filters: data.filters }, { keepValues: true });
    }
  });

  return (
    <FormProvider {...methods}>
      <PageLayout
        errors={errors}
        name="filters"
        headerProps={{
          submitButtonProps: {
            disabled: !isDirty,
            onClick: onSubmit,
          },
          title: 'Filters & Sort',
          status: false,
        }}
        leftColumn={[
          <NavFilters key="filters" loading={!isReady || loading} />,
        ]}
        rightColumn={renderNavigation({
          isDirty,
          save: onSubmit,
        })}
      />
    </FormProvider>
  );
};
