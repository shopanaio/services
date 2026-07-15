import { MoreOutlined, PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { Button, Dropdown, Table, Typography } from "antd";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { EMAIL_TEMPLATE_LABELS } from "../../email/constants";
import {
  useDeleteEmailTemplateModal,
  useEmailTemplateModal,
  useSendTestEmailModal,
} from "../../email/modals";
import {
  EMAIL_TEMPLATE_TYPES,
  type EmailTemplate,
} from "../../email/types";

export const EmailTemplatesTable = ({
  templates,
  loading,
  onSaved,
}: {
  templates: EmailTemplate[];
  loading: boolean;
  onSaved: () => Promise<unknown>;
}) => {
  const templateModal = useEmailTemplateModal();
  const testModal = useSendTestEmailModal();
  const deleteModal = useDeleteEmailTemplateModal();
  const availableTypes = EMAIL_TEMPLATE_TYPES.filter(
    (type) => !templates.some((template) => template.type === type),
  );
  const columns: ColumnsType<EmailTemplate> = [
    {
      dataIndex: "type",
      key: "type",
      title: "Type",
      width: 260,
      render: (type: EmailTemplate["type"]) => (
        <Typography.Text>{EMAIL_TEMPLATE_LABELS[type]}</Typography.Text>
      ),
    },
    { dataIndex: "subject", key: "subject", title: "Subject" },
    {
      align: "right",
      key: "actions",
      width: 64,
      render: (value, template) => {
        void value;
        return (
          <Dropdown
            menu={{
              items: [
                {
                  key: "edit",
                  label: "Edit",
                  onClick: () =>
                    templateModal.push({
                      template,
                      type: template.type,
                      onSaved,
                    }),
                },
                {
                  key: "test",
                  label: "Send test email",
                  onClick: () =>
                    testModal.push({ type: template.type, onSaved }),
                },
                { type: "divider" },
                {
                  key: "delete",
                  danger: true,
                  label: "Delete",
                  onClick: () =>
                    deleteModal.push({
                      templateId: template.id,
                      templateLabel: EMAIL_TEMPLATE_LABELS[template.type],
                      onSaved,
                    }),
                },
              ],
            }}
            trigger={["click"]}
          >
            <Button
              aria-label="Template actions"
              icon={<MoreOutlined />}
              type="text"
            />
          </Dropdown>
        );
      },
    },
  ];

  return (
    <Paper data-testid="email-templates-section">
      <PaperHeader title="Templates" />
      <Table<EmailTemplate>
        columns={columns}
        dataSource={templates}
        loading={loading}
        pagination={false}
        rowKey="id"
        tableLayout="fixed"
      />
      {availableTypes.length ? (
        <Dropdown
          menu={{
            items: availableTypes.map((type) => ({
              key: type,
              label: EMAIL_TEMPLATE_LABELS[type],
              onClick: () =>
                templateModal.push({ template: null, type, onSaved }),
            })),
          }}
          trigger={["click"]}
        >
          <Button icon={<PlusOutlined />} style={{ marginTop: 16 }}>
            Add email template
          </Button>
        </Dropdown>
      ) : null}
    </Paper>
  );
};
