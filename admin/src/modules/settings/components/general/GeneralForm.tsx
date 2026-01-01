import { defaultFilterFormValues } from '@modules/discovery/defs';
import { $projects } from '@modules/projects/store/projects';
import { useSelector } from '@reframework/qx';
import { PageLayout } from '@src/layouts/page/components/PageLayout';
import { FormProvider, useForm } from 'react-hook-form';
import { StoreLanguages } from '@modules/settings/components/general/Languages';
import { StoreUnits } from '@modules/settings/components/general/Units';
import { StoreCurrencies } from '@modules/settings/components/general/Currencies';
import { StoreLocation } from '@modules/settings/components/general/Location';
import { StoreInformation } from '@modules/settings/components/general/Information';
import { StoreDangerZone } from '@modules/settings/components/general/DangerZone';
import { SettingsNav } from '@modules/settings/components/Nav';
import { SETTINGS_TABS } from '@modules/settings/defs';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

export const GeneralForm = () => {
  const { formatMessage } = useIntl();
  const methods = useForm({
    defaultValues: defaultFilterFormValues,
  });

  const project = useSelector($projects.currentProject)!;

  return (
    <FormProvider {...methods}>
      <PageLayout
        errors={{}}
        name="filters"
        headerProps={{
          switchLocale: false,
          submitButtonProps: null,
          title: formatMessage({ id: t('settings.general.title') }),
          status: false,
        }}
        leftColumn={
          <>
            <StoreInformation project={project} />
            <StoreLocation project={project} />
            <StoreLanguages project={project} />
            <StoreCurrencies project={project} />
            <StoreUnits />
            <StoreDangerZone project={project} />
          </>
        }
        rightColumn={<SettingsNav tab={SETTINGS_TABS.GENERAL} />}
      />
    </FormProvider>
  );
};
