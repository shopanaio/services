import { useCrmColumns } from '@modules/crm/hooks/crm';
import { CrmColumnSettings } from '@modules/settings/components/crm/CrmColumnsSettings';
import { SettingsNav } from '@modules/settings/components/Nav';
import { SETTINGS_TABS } from '@modules/settings/defs';
import { ICrmColumn } from '@src/entity/Order/Crm';
import { SettingsLayout } from '@src/layouts/page/components/SettingsLayout';
import { ReactNode, useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

export const CrmColumnForm = () => {
  const { formatMessage } = useIntl();
  const { columns } = useCrmColumns();

  const methods = useForm({
    defaultValues: {
      columns: [] as ICrmColumn[],
    },
  });

  const { reset, formState } = methods;
  const { isDirty, errors } = formState;

  useEffect(() => {
    reset({ columns });
  }, [reset, columns]);

  return (
    <FormProvider {...methods}>
      <SettingsLayout
        errors={errors}
        name="fulfillment"
        headerProps={{
          switchLocale: false,
          title: formatMessage({ id: t('settings.crm.title') }),
          status: false,
          submitButtonProps: null,
        }}
        leftColumn={[<CrmColumnSettings key="boards" />]}
        rightColumn={
          <SettingsNav tab={SETTINGS_TABS.FUNNEL} isDirty={isDirty} />
        }
      />
    </FormProvider>
  );
};
