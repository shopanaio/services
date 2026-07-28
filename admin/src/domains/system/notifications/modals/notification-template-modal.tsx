"use client";

import {
  Alert,
  App,
  Empty,
  Segmented,
  Skeleton,
  Tabs,
  Tag,
  Typography,
} from "antd";
import { createStyles } from "antd-style";
import { useEffect, useMemo, useState } from "react";
import { LuPlus as PlusOutlined } from "react-icons/lu";
import {
  type ApiNotificationPreview,
  type ApiNotificationTemplateVariable,
  NotificationChannel,
} from "@/graphql/types";
import { useStore } from "@/domains/workspace";
import { CodeEditor } from "@/domains/system/email-templates/components";
import {
  ModalHeader,
  ModalLayout,
  useModalStackContext,
} from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import {
  useNotificationTemplate,
  useNotificationTemplatePreview,
  useUpdateNotificationTemplate,
} from "../hooks";
import type { NotificationTemplateModalPayload } from "../modals";

type EditorMode = "Edit" | "Preview" | "Variables";

interface TemplateDraft {
  subject: string;
  body: string;
  plainText: string;
  pointerVersion: number;
}

const TEMPLATE_CHANNELS = [
  NotificationChannel.Email,
  NotificationChannel.Sms,
] as const;

const useStyles = createStyles(({ css, token }) => ({
  form: {
    display: "flex",
    flex: 1,
    flexDirection: "column",
    gap: token.margin,
    minHeight: 0,
  },
  details: css`
    padding: 0;
    flex: none;
    overflow: hidden;

    .ant-tabs-nav {
      margin: 10px 16px 0;
    }

    .ant-tabs-content-holder {
      display: none;
    }
  `,
  fields: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    padding: "10px 16px 16px",
  },
  label: {
    color: token.colorTextSecondary,
    fontSize: 13,
    lineHeight: "22px",
  },
  helper: {
    color: token.colorTextSecondary,
    fontSize: 13,
    lineHeight: "22px",
    opacity: 0.65,
  },
  editorPaper: {
    display: "flex",
    flex: 1,
    flexDirection: "column",
    minHeight: 420,
    padding: 0,
    overflow: "hidden",
  },
  editorToolbar: {
    flex: "0 0 50px",
    background: token.colorFillQuaternary,
  },
  languageBadge: {
    margin: 0,
    paddingInline: 13,
    color: token.colorPrimaryText,
    fontSize: 10,
    fontWeight: token.fontWeightStrong,
    lineHeight: "22px",
    background: token.colorPrimaryBg,
    border: 0,
    borderRadius: 12,
  },
  editorBody: {
    flex: 1,
    minHeight: 0,
    background: token.colorBgContainer,
  },
  preview: {
    boxSizing: "border-box",
    display: "flex",
    height: "100%",
    flexDirection: "column",
    gap: 12,
    padding: 16,
  },
  previewFrame: {
    width: "100%",
    flex: 1,
    minHeight: 320,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadius,
  },
  previewText: {
    flex: 1,
    margin: 0,
    padding: 16,
    whiteSpace: "pre-wrap",
    background: token.colorFillQuaternary,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadius,
  },
  variables: {
    height: "100%",
    overflowY: "auto",
    padding: 16,
  },
  variableRow: {
    display: "grid",
    gridTemplateColumns: "minmax(180px, 0.8fr) 90px minmax(240px, 1.5fr)",
    gap: 12,
    alignItems: "start",
    paddingBlock: 10,
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
  },
  variablePath: {
    fontFamily: token.fontFamilyCode,
    fontSize: 12,
  },
  channelUnavailable: {
    margin: "auto",
  },
}));

function flattenVariables(
  variables: ApiNotificationTemplateVariable[],
): ApiNotificationTemplateVariable[] {
  return variables.flatMap((variable) => [
    variable,
    ...flattenVariables(variable.children ?? []),
  ]);
}

function toDraft(
  template: ReturnType<typeof useNotificationTemplate>["template"],
): TemplateDraft | null {
  if (!template) return null;
  return {
    subject: template.subjectTemplate ?? "",
    body: template.bodyTemplate,
    plainText: template.plainTextTemplate ?? "",
    pointerVersion: template.pointerVersion ?? 0,
  };
}

function isSameDraft(left?: TemplateDraft, right?: TemplateDraft) {
  return (
    left?.subject === right?.subject &&
    left?.body === right?.body &&
    left?.plainText === right?.plainText &&
    left?.pointerVersion === right?.pointerVersion
  );
}

function setPreviewValue(
  target: Record<string, unknown>,
  path: string,
  value: unknown,
) {
  const parts = path.split(".").filter(Boolean);
  let current = target;
  parts.forEach((part, index) => {
    if (index === parts.length - 1) {
      current[part] = value;
      return;
    }
    const next = current[part];
    if (!next || typeof next !== "object" || Array.isArray(next)) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  });
}

function buildPreviewData(
  variables: ApiNotificationTemplateVariable[],
  locale: string,
) {
  const data: Record<string, unknown> = {
    store: {
      id: "00000000-0000-4000-8000-000000000001",
      displayName: "Demo store",
      defaultLocale: locale,
      timezone: "UTC",
    },
    application: {
      id: "00000000-0000-4000-8000-000000000002",
    },
  };

  flattenVariables(variables).forEach((variable) => {
    if (variable.path === "*") return;
    const normalizedType = variable.type.toUpperCase();
    const value = normalizedType.includes("URL")
      ? "https://example.com"
      : normalizedType.includes("NUMBER") ||
          normalizedType.includes("INT") ||
          normalizedType.includes("MONEY")
        ? 42
        : variable.path.endsWith(".otp")
          ? "123456"
          : variable.path.split(".").at(-1)?.replaceAll("_", " ") ||
            "Example";
    setPreviewValue(data, variable.path, value);
  });

  return data;
}

export function NotificationTemplateModal() {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const store = useStore();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const {
    allowedChannels,
    definitionKey,
    onSaved,
    title,
    variables,
  } = payload as NotificationTemplateModalPayload;
  const channels = useMemo(
    () =>
      TEMPLATE_CHANNELS.filter((channel) =>
        allowedChannels.includes(channel),
      ),
    [allowedChannels],
  );
  const [channel, setChannel] = useState<NotificationChannel>(
    channels[0] ?? NotificationChannel.Email,
  );
  const [mode, setMode] = useState<EditorMode>("Edit");
  const [drafts, setDrafts] = useState<
    Partial<Record<NotificationChannel, TemplateDraft>>
  >({});
  const [baselines, setBaselines] = useState<
    Partial<Record<NotificationChannel, TemplateDraft>>
  >({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ApiNotificationPreview | null>(null);
  const locale = store?.defaultLocale ?? "en";
  const query = useNotificationTemplate(
    definitionKey,
    channel,
    locale,
    channels.length === 0,
  );
  const previewMutation = useNotificationTemplatePreview();
  const mutation = useUpdateNotificationTemplate();

  useEffect(() => {
    if (
      !query.template ||
      query.template.channel !== channel ||
      query.template.locale !== locale
    ) {
      return;
    }
    const next = toDraft(query.template);
    if (!next) return;

    setDrafts((current) =>
      current[channel] ? current : { ...current, [channel]: next },
    );
    setBaselines((current) =>
      current[channel] ? current : { ...current, [channel]: next },
    );
  }, [channel, locale, query.template]);

  const dirtyChannels = channels.filter(
    (candidate) => !isSameDraft(drafts[candidate], baselines[candidate]),
  );
  const isDirty = dirtyChannels.length > 0;
  const draft = drafts[channel];

  useEffect(() => setDirty(isDirty), [isDirty, setDirty]);

  const updateDraft = (patch: Partial<TemplateDraft>) => {
    setDrafts((current) => {
      const currentDraft = current[channel];
      if (!currentDraft) return current;
      return {
        ...current,
        [channel]: { ...currentDraft, ...patch },
      };
    });
    setPreview(null);
    setValidationError(null);
  };

  const changeMode = async (nextMode: EditorMode) => {
    setMode(nextMode);
    setValidationError(null);
    previewMutation.reset();
    if (nextMode !== "Preview" || !draft) return;

    const result = await previewMutation.previewTemplate({
      key: definitionKey,
      channel: NotificationChannel.Email,
      locale,
      data: buildPreviewData(variables, locale),
      subjectTemplate: draft.subject,
      bodyTemplate: draft.body,
      plainTextTemplate: draft.plainText || null,
    });
    if (result.userErrors.length > 0) {
      setPreview(null);
      setValidationError(
        result.userErrors.map((error) => error.message).join(" "),
      );
      return;
    }
    setPreview(result.data);
  };

  const save = async () => {
    setValidationError(null);

    for (const dirtyChannel of dirtyChannels) {
      const candidate = drafts[dirtyChannel];
      if (!candidate) continue;
      if (!candidate.body.trim()) {
        setChannel(dirtyChannel);
        setMode("Edit");
        setValidationError(
          dirtyChannel === NotificationChannel.Sms
            ? "Message is required."
            : "Template body is required.",
        );
        return;
      }
      if (
        dirtyChannel === NotificationChannel.Email &&
        !candidate.subject.trim()
      ) {
        setChannel(dirtyChannel);
        setMode("Edit");
        setValidationError("Subject is required.");
        return;
      }

      const result = await mutation.updateTemplate({
        key: definitionKey,
        channel: dirtyChannel,
        locale,
        subjectTemplate:
          dirtyChannel === NotificationChannel.Email
            ? candidate.subject
            : null,
        bodyTemplate: candidate.body,
        plainTextTemplate:
          dirtyChannel === NotificationChannel.Email
            ? candidate.plainText || null
            : null,
        expectedVersion: candidate.pointerVersion,
      });

      if (!result.data || result.userErrors.length > 0) {
        setChannel(dirtyChannel);
        setValidationError(
          result.userErrors.map((error) => error.message).join(" ") ||
            "The template could not be saved.",
        );
        return;
      }

      const saved = toDraft(result.data);
      if (saved) {
        setDrafts((current) => ({ ...current, [dirtyChannel]: saved }));
        setBaselines((current) => ({ ...current, [dirtyChannel]: saved }));
      }
    }

    await onSaved?.();
    setDirty(false);
    message.success("Notification template updated");
    forcePop();
  };

  const flatVariables = useMemo(
    () => flattenVariables(variables),
    [variables],
  );
  const channelItems = [
    ...channels.map((candidate) => ({
      key: candidate,
      label: candidate === NotificationChannel.Email ? "Email" : "SMS",
    })),
    {
      key: "add",
      label: (
        <PlusOutlined
          aria-label="Add notification channel"
          size={14}
        />
      ),
      disabled: true,
    },
  ];
  const errorMessage =
    validationError ??
    query.error?.message ??
    mutation.error?.message ??
    previewMutation.error?.message;

  return (
    <ModalLayout
      name="notification-template"
      header={
        <ModalHeader
          name="notification-template"
          onClose={pop}
          submitButtonProps={{
            children: "Save",
            disabled: !isDirty,
            loading: mutation.loading,
            onClick: () => void save().catch(() => undefined),
          }}
          title={title}
        />
      }
    >
      <div className={styles.form}>
        {errorMessage ? (
          <Alert message={errorMessage} showIcon type="error" />
        ) : null}
        {channels.length === 0 ? (
          <Empty
            className={styles.channelUnavailable}
            description="This notification does not have an editable email or SMS template."
          />
        ) : (
          <>
            <Paper className={styles.details}>
              <Tabs
                activeKey={channel}
                items={channelItems}
                onChange={(nextChannel) => {
                  if (nextChannel === "add") return;
                  setChannel(nextChannel as NotificationChannel);
                  setMode("Edit");
                  setPreview(null);
                  setValidationError(null);
                }}
                size="small"
                tabBarGutter={2}
                type="card"
              />
              <div className={styles.fields}>
                {query.loading && !draft ? (
                  <Skeleton.Input active block />
                ) : channel === NotificationChannel.Email ? (
                  <>
                    <Typography.Text className={styles.label}>
                      Subject
                    </Typography.Text>
                    <CodeEditor
                      ariaLabel="Email subject"
                      fontSize={13}
                      height="34px"
                      language="handlebars-inline"
                      lineNumbers={false}
                      minHeight="34px"
                      onChange={(subject) => updateDraft({ subject })}
                      singleLine
                      value={draft?.subject ?? ""}
                      wordWrap={false}
                    />
                  </>
                ) : (
                  <>
                    <Typography.Text className={styles.label}>
                      Message
                    </Typography.Text>
                    <CodeEditor
                      ariaLabel="SMS message"
                      fontSize={13}
                      height="80px"
                      language="handlebars-inline"
                      lineNumbers={false}
                      minHeight="80px"
                      onChange={(body) => updateDraft({ body })}
                      value={draft?.body ?? ""}
                    />
                    <Typography.Text className={styles.helper}>
                      Messages longer than 160 GSM-7 characters are sent as
                      multiple segments.
                    </Typography.Text>
                  </>
                )}
              </div>
            </Paper>

            {channel === NotificationChannel.Email ? (
              <Paper className={styles.editorPaper}>
                <PaperHeader
                  actions={
                    <Tag className={styles.languageBadge}>
                      HTML + Handlebars
                    </Tag>
                  }
                  className={styles.editorToolbar}
                  contained
                  title={
                    <Segmented<EditorMode>
                      onChange={(nextMode) =>
                        void changeMode(nextMode).catch(() => undefined)
                      }
                      options={["Edit", "Preview", "Variables"]}
                      size="small"
                      value={mode}
                    />
                  }
                />
                <div
                  className={styles.editorBody}
                  data-testid="notification-template-body-editor"
                >
                  {query.loading && !draft ? (
                    <Skeleton active paragraph={{ rows: 12 }} />
                  ) : mode === "Edit" ? (
                    <CodeEditor
                      ariaLabel="Email template body"
                      bordered={false}
                      dataTestId="notification-template-body-code-editor"
                      language="handlebars"
                      onChange={(body) => updateDraft({ body })}
                      theme="light"
                      value={draft?.body ?? ""}
                    />
                  ) : mode === "Preview" ? (
                    <div className={styles.preview}>
                      {previewMutation.loading ? (
                        <Skeleton active paragraph={{ rows: 12 }} />
                      ) : preview ? (
                        <>
                          <Typography.Title level={5}>
                            {preview.subject}
                          </Typography.Title>
                          {preview.warnings.length > 0 ? (
                            <Alert
                              message={preview.warnings.join(" ")}
                              showIcon
                              type="warning"
                            />
                          ) : null}
                          {preview.html ? (
                            <iframe
                              className={styles.previewFrame}
                              sandbox=""
                              srcDoc={preview.html}
                              title="Notification template preview"
                            />
                          ) : (
                            <pre className={styles.previewText}>
                              {preview.text}
                            </pre>
                          )}
                        </>
                      ) : (
                        <Empty description="Preview is unavailable" />
                      )}
                    </div>
                  ) : (
                    <div className={styles.variables}>
                      {flatVariables.length === 0 ? (
                        <Empty
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          description="No template variables"
                        />
                      ) : (
                        flatVariables.map((variable) => (
                          <div
                            className={styles.variableRow}
                            key={variable.path}
                          >
                            <Typography.Text
                              className={styles.variablePath}
                              copyable={{ text: `{{ ${variable.path} }}` }}
                            >
                              {`{{ ${variable.path} }}`}
                            </Typography.Text>
                            <Tag>
                              {variable.type}
                              {variable.required ? " · required" : ""}
                            </Tag>
                            <Typography.Text type="secondary">
                              {variable.description}
                            </Typography.Text>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </Paper>
            ) : null}
          </>
        )}
      </div>
    </ModalLayout>
  );
}
