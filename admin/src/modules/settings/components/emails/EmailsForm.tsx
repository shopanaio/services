import { useQuery } from '@apollo/client';
import { IconButton } from '@components/IconButton';
import { Label } from '@components/forms/Label';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { SettingsNav } from '@modules/settings/components/Nav';
import { EmailProfileModal } from '@modules/settings/components/emails/ProfileModal';
import { EmailSettingsModal } from '@modules/settings/components/emails/SettingsModal';
import { EmailTemplates } from '@modules/settings/components/emails/Templates';
import { SETTINGS_TABS } from '@modules/settings/defs';
import {
  EmailTemplatesAndSettings,
  ApiEmailTemplatesAndSettingsQueryResponse,
} from '@modules/settings/graphql/emails';
import {
  EmailProfile,
  EmailSettings,
  EmailTemplate,
  IEmailProfile,
  IEmailSettings,
  IEmailTemplate,
} from '@src/entity/Email/Email';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { PageLayout } from '@src/layouts/page/components/PageLayout';
import { Input } from 'antd';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

export const EmailsForm = () => {
  const { formatMessage } = useIntl();
  const [editingType, setEditingType] = useState<'settings' | 'profile' | null>(
    null,
  );

  const { data, loading } = useQuery<ApiEmailTemplatesAndSettingsQueryResponse>(
    EmailTemplatesAndSettings,
    { fetchPolicy: 'no-cache' },
  );

  const { profile, settings, templates } = useMemo(() => {
    const nextValues = {
      profile: null,
      settings: null,
      templates: [],
    } as {
      profile: IEmailProfile | null;
      settings: IEmailSettings | null;
      templates: IEmailTemplate[];
    };

    const settings = data?.emailSettingsQuery?.findOne;
    const profile = data?.emailProfilesQuery?.findOne;

    if (settings) {
      nextValues.settings = EmailSettings.create(settings);
    }

    if (profile) {
      nextValues.profile = EmailProfile.create(profile);
    }

    nextValues.templates = (data?.emailTemplateQuery?.findMany || []).map(
      (it) => EmailTemplate.create(it),
    );

    return nextValues;
  }, [data, loading]);

  return (
    <PageLayout
      errors={{}}
      name="emails"
      headerProps={{
        switchLocale: false,
        submitButtonProps: null,
        title: formatMessage({ id: t('settings.emails.title') }),
        status: false,
      }}
      leftColumn={[
        <DrawerPaper key="general">
          <DrawerPaperHeader
            name="emails"
            title={formatMessage({ id: t('settings.emails.info') })}
            extra={
              <IconButton
                icon="edit"
                onClick={() => {
                  setEditingType('settings');
                }}
              />
            }
          />
          <Flex gap="4">
            <Flex direction="column" grow="1">
              <Label>{formatMessage({ id: t('settings.emails.from') })}</Label>
              <Input readOnly value={settings?.from || ''} />
            </Flex>

            <Flex direction="column" grow="1">
              <Label>{formatMessage({ id: t('settings.emails.reply') })}</Label>
              <Input readOnly value={settings?.replyTo || ''} />
            </Flex>
          </Flex>
        </DrawerPaper>,
        <DrawerPaper key="smtp">
          <DrawerPaperHeader
            name="smtp"
            title={formatMessage({ id: t('settings.emails.smtpSettings') })}
            extra={
              <IconButton
                icon="edit"
                onClick={() => {
                  setEditingType('profile');
                }}
              />
            }
          />
          <Flex gap="4">
            <Flex direction="column" grow="1">
              <Label>{formatMessage({ id: t('settings.emails.smtpHost') })}</Label>
              <Input value={profile?.host || ''} readOnly />
            </Flex>

            <Flex direction="column">
              <Label htmlFor="country-field">
                {formatMessage({ id: t('settings.emails.port') })}
              </Label>
              <Input
                readOnly
                type="number"
                value={profile?.port || ''}
                css={css`
                  width: 100px;
                `}
              />
            </Flex>
          </Flex>
          <Flex gap="4" mt="4">
            <Flex direction="column" grow="1">
              <Label>{formatMessage({ id: t('settings.emails.username') })}</Label>
              <Input value={profile?.username || ''} readOnly />
            </Flex>
            <Flex direction="column" grow="1">
              <Label
                info={formatMessage({ id: t('settings.emails.password.info') })}
              >
                {formatMessage({ id: t('settings.emails.password') })}
              </Label>
              <Input.Password value="" disabled readOnly />
            </Flex>
          </Flex>
        </DrawerPaper>,
        <EmailProfileModal
          open={editingType === 'profile'}
          onClose={() => {
            setEditingType(null);
          }}
          profile={profile}
        />,
        <EmailSettingsModal
          open={editingType === 'settings'}
          onClose={() => {
            setEditingType(null);
          }}
          settings={settings}
        />,
        <EmailTemplates templates={templates} />,
      ]}
      rightColumn={<SettingsNav tab={SETTINGS_TABS.EMAILS} isDirty={false} />}
    />
  );
};
