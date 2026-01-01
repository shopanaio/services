import { IconButton } from '@components/IconButton';
import { Label } from '@components/forms/Label';
import { useLocales } from '@modules/locales/hooks/useLocales';
import { defaultFilterFormValues } from '@modules/navigation/defs';
import { useProjects } from '@modules/projects/hooks/useProjects';
import { $projects } from '@modules/projects/store/projects';
import { IRenderSettingsProps } from '@modules/settings/components/Settings';
import { useSelector } from '@reframework/qx';
import {
  allowedCountries,
  shopCountries,
} from '@src/defs/localization/countries';
import { allowedTimezones, timezones } from '@src/defs/localization/timezones';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { PageLayout } from '@src/layouts/page/components/PageLayout';
import { DataTable } from '@src/layouts/table/components/Table';
import { Button, Input, Select } from 'antd';
import FormItem from 'antd/es/form/FormItem';
import { ReactNode } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

interface IGeneralFormProps {
  tab: string;
  renderSettings: (props: IRenderSettingsProps) => ReactNode;
}

export const GeneralForm = ({ renderSettings }: IGeneralFormProps) => {
  const methods = useForm({
    defaultValues: defaultFilterFormValues,
  });

  const { locales } = useLocales();
  const { country, name, timezone } = useSelector($projects.currentProject)!;

  const { reset, handleSubmit, formState } = methods;
  const { isDirty, errors, dirtyFields } = formState;

  const {} = useProjects();

  const onSubmit = handleSubmit(async (data: any) => {
    if (dirtyFields.filters) {
      reset({ filters: data.filters }, { keepValues: true });
    }
  });

  return (
    <FormProvider {...methods}>
      <PageLayout
        errors={errors}
        name="filters"
        headerProps={{
          switchLocale: false,
          submitButtonProps: null,
          title: 'Store details',
          status: false,
        }}
        leftColumn={[
          <DrawerPaper key="general">
            <DrawerPaperHeader
              title="Information"
              extra={<IconButton icon="edit" />}
            />
            <FormItem>
              <Label required>Name</Label>
              <Input value={name} readOnly />
            </FormItem>
            <FormItem>
              <Label required htmlFor="country-field">
                Country/Region
              </Label>
              <Select
                value={country}
                showSearch
                style={{ width: '100%' }}
                id="country-field"
                placeholder="Select a country"
                data-testid="country-field"
                options={shopCountries
                  .filter((it) => allowedCountries.includes(it.value))
                  .map((it) => ({ value: it.value, label: it.name }))
                  .sort((a, b) => a.label.localeCompare(b.label))}
              />
            </FormItem>
            <FormItem>
              <Label required>Timezone</Label>
              <Select
                value={timezone}
                // onChange={field.onChange}
                showSearch
                id="tz-field"
                data-testid="tz-field"
                placeholder="Select timezone"
                options={timezones
                  .filter((it) => allowedTimezones.includes(it.value))
                  .map((it) => ({ value: it.value, label: it.name }))
                  .sort((a, b) => a.label.localeCompare(b.label))}
              />
            </FormItem>
          </DrawerPaper>,
          <DrawerPaper key="currencies">
            <DrawerPaperHeader
              title="Currencies"
              extra={<Button disabled>Add currency</Button>}
            />
            <DataTable
              showHeader={false}
              rowSelection={false}
              columns={[{ key: 'name', dataIndex: 'title' }]}
              data={[{ title: 'USD' }]}
            />
          </DrawerPaper>,
          <DrawerPaper key="locales">
            <DrawerPaperHeader
              title="Languages"
              extra={<Button disabled>Add language</Button>}
            />
            <DataTable
              showHeader={false}
              rowSelection={false}
              columns={[{ key: 'name', dataIndex: 'title' }]}
              data={locales}
            />
          </DrawerPaper>,
        ]}
        rightColumn={renderSettings({
          isDirty,
          save: onSubmit,
        })}
      />
    </FormProvider>
  );
};
