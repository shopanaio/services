import { GeneralForm } from '@modules/settings/components/general/GeneralForm';
import { EmailsForm } from '@modules/settings/components/emails/EmailsForm';
import { SETTINGS_TABS } from '@modules/settings/defs';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { TagsTable } from '@modules/tags/components/TagsTable';
import { CrmColumnForm } from '@modules/settings/components/crm/CrmColumnForm';
import { ApiKeysTable } from '@modules/apiKeys/components/ApiKeysTable';
import { Apps } from '@modules/apps/components/Apps';

const Settings = () => {
  const { tab } = useParams();
  const current = useMemo(() => {
    return tab || SETTINGS_TABS.GENERAL;
  }, [tab]);

  if (SETTINGS_TABS.GENERAL === current) {
    return <GeneralForm />;
  }

  if (SETTINGS_TABS.EMAILS === current) {
    return <EmailsForm />;
  }

  if (SETTINGS_TABS.APPS === current) {
    return <Apps />;
  }

  if (SETTINGS_TABS.FUNNEL === current) {
    return <CrmColumnForm />;
  }

  if (SETTINGS_TABS.TAGS === current) {
    return <TagsTable />;
  }

  if (SETTINGS_TABS.API_KEYS === current) {
    return <ApiKeysTable />;
  }

  if (SETTINGS_TABS.PAYMENTS === current) {
    return null;
  }

  if (SETTINGS_TABS.SHIPPING === current) {
    return null;
  }

  return null;
};

// eslint-disable-next-line import/no-default-export
export default Settings;
