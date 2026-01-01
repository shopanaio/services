import { actionsColumn } from '@components/table/columns';
import { Box } from '@components/utility/Box';
import { getRefetchQueries } from '@modules/app/components/Apollo';
import { EmailTemplateModal } from '@modules/settings/components/emails/TemplateModal';
import { TestEmailModal } from '@modules/settings/components/emails/TestEmailModal';
import {
  getTestOrder,
  getTestUser,
} from '@modules/settings/components/emails/json';
import { useDelete } from '@modules/shared/hooks/useDelete';
import { allowedTemplates, emailTypeLabels } from '@src/defs/constants';
import { Entity } from '@src/defs/entities';

import { IEmailTemplate } from '@src/entity/Email/Email';
import { EmailTypeEnum } from '@src/graphql';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { DataTable } from '@src/layouts/table/components/Table';
import { Button, Dropdown, Typography } from 'antd';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

export type ITemplateFormValue = {
  id: ID | null;
  type: EmailTypeEnum;
  subject: string;
  body: string;
};

interface IEmailTemplatesProps {
  templates: IEmailTemplate[];
}

const variablesMapping = {
  CustomerOrderCreated: getTestOrder,
  CustomerOrderDelivered: getTestOrder,
  CustomerOrderShipped: getTestOrder,
  CustomerOrderCancelled: getTestOrder,
  CustomerInvitation: getTestUser,
  CustomerResetPassword: getTestUser,
  CustomerSignUp: getTestUser,
  TenantInvitation: getTestUser,
  TenantResetPassword: getTestUser,
  TenantSignUp: getTestUser,
};

export const EmailTemplates = ({ templates }: IEmailTemplatesProps) => {
  const { formatMessage } = useIntl();
  const [editingTemplate, setEditingTemplate] =
    useState<ITemplateFormValue | null>(null);

  const [editingTestEmail, setEditingTestEmail] =
    useState<EmailTypeEnum | null>(null);

  const { deleteEntry } = useDelete();

  const onDelete = (id: number) => {
    deleteEntry(id, Entity.EmailTpl, {
      refetchQueries: getRefetchQueries(),
    });
  };

  const onCreate = (type: EmailTypeEnum) => {
    setEditingTemplate({
      body: '',
      id: null as unknown as number,
      subject: '',
      type,
    });
  };

  const onEdit = (template: IEmailTemplate) => {
    setEditingTemplate({
      body: template.body,
      id: template.id,
      subject: template.subject,
      type: template.type,
    });
  };

  return (
    <DrawerPaper>
      <DrawerPaperHeader
        title={formatMessage({ id: t('settings.emailTemplates.title') })}
      />
      {!!(templates || []).length && (
        <DataTable
          rowSelection={false}
          pagination={false}
          data={templates}
          columns={[
            {
              title: formatMessage({ id: t('settings.emailTemplates.type') }),
              key: 'type',
              dataIndex: 'type',
              width: 300,
              render: (type: EmailTypeEnum) => {
                return (
                  <Typography.Text>{emailTypeLabels[type]}</Typography.Text>
                );
              },
            },
            {
              title: formatMessage({
                id: t('settings.emailTemplates.subject'),
              }),
              key: 'subject',
              dataIndex: 'subject',
            },
            actionsColumn({
              onEdit: (record: IEmailTemplate) => {
                onEdit(record);
              },
              onDelete: (record: IEmailTemplate) => {
                onDelete(record.id);
              },
              items: [
                {
                  key: 'test',
                  label: formatMessage({
                    id: t('settings.emailTemplates.sendTest'),
                  }),
                  onClick: (record: IEmailTemplate) => {
                    setEditingTestEmail(record.type);
                  },
                },
              ],
            }),
          ]}
        />
      )}
      {templates.length < allowedTemplates.length ? (
        <Box mt="4">
          <Dropdown
            trigger={['click']}
            menu={{
              style: { minWidth: 150 },
              items: (allowedTemplates as any)
                .map((key) => ({
                  key,
                  label: emailTypeLabels[key],
                  onClick: () => onCreate(key),
                }))
                .filter((it) => {
                  return !templates.some(({ type }: IEmailTemplate) => {
                    return it.key === type;
                  });
                }),
            }}
          >
            <Button>
              {formatMessage({ id: t('settings.emailTemplates.addTemplate') })}
            </Button>
          </Dropdown>
        </Box>
      ) : undefined}
      <EmailTemplateModal
        open={!!editingTemplate}
        template={editingTemplate}
        onClose={() => {
          setEditingTemplate(null);
        }}
        onSubmit={() => {
          setEditingTemplate(null);
        }}
        variables={
          editingTemplate
            ? variablesMapping[editingTemplate.type]?.() || {}
            : {}
        }
      />
      <TestEmailModal
        open={!!editingTestEmail}
        type={editingTestEmail}
        onClose={() => {
          setEditingTestEmail(null);
        }}
      />
    </DrawerPaper>
  );
};
