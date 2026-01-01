/* eslint-disable jsx-a11y/no-autofocus */
import { css } from '@emotion/react';
import { Button, Input, Modal } from 'antd';
import { CodeEditor } from '@components/codeEditor/CodeEditor';
import { Controller, useForm } from 'react-hook-form';
import { ITemplateFormValue } from '@modules/settings/components/emails/Templates';
import { ApiUpdateEmailTemplateInput } from '@src/graphql';
import { useEffect, useState } from 'react';
import { Flex } from '@components/utility/Flex';
import { ValidationAlert } from '@components/forms/ValidationAlert';
import { Label } from '@components/forms/Label';
import { useCreateEmailTemplate } from '@modules/settings/hooks/useCreateEmailTemplate';
import { useUpdateEmailTemplate } from '@modules/settings/hooks/useUpdateEmailTemplate';
import { IEmailTemplate } from '@src/entity/Email/Email';
import { getTestOrder } from '@modules/settings/components/emails/json';

import { getRefetchQueries } from '@modules/app/components/Apollo';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

const s = {
  container: css`
    padding: var(--x2);
    height: calc(100vh - 200px);
    box-sizing: border-box;
  `,
};

interface ICodeEditorModalProps {
  open: boolean;
  onClose: () => void;
  template: ITemplateFormValue | null;
  onSubmit: (data: IEmailTemplate) => void;
  variables: string;
}

export const EmailTemplateModal = ({
  open,
  onClose,
  template,
  onSubmit,
  variables,
}: ICodeEditorModalProps) => {
  const { formatMessage } = useIntl();
  const [showVariables, setShowVariables] = useState(false);

  const methods = useForm({
    defaultValues: {} as ITemplateFormValue,
    // resolver: yupResolver(getAttributeModalSchema(locales)) as any,
  });

  const { control, handleSubmit, formState, reset } = methods;
  const { dirtyFields, isDirty } = formState;

  const { createEmailTemplate } = useCreateEmailTemplate();
  const { updateEmailTemplate } = useUpdateEmailTemplate();

  useEffect(() => {
    if (template) {
      reset(template);
    }
  }, [template, reset]);

  const onOk = handleSubmit(async (data) => {
    if (!data.id) {
      const response = await createEmailTemplate({
        subject: data.subject,
        template: data.body,
        type: data.type,
      });

      if (response.data?.emailTemplateMutation?.create) {
        onSubmit({
          ...data,
          id: response.data?.emailTemplateMutation?.create?.id,
        } as IEmailTemplate);
      }

      return;
    }

    const payload = { id: data.id } as ApiUpdateEmailTemplateInput;
    if (dirtyFields.body) {
      payload.template = data.body;
    }

    if (dirtyFields.subject) {
      payload.subject = data.subject;
    }

    await updateEmailTemplate(payload, {
      refetchQueries: getRefetchQueries(),
    });
    onSubmit(data as IEmailTemplate);
  });

  const isNew = template?.id === null;

  return (
    <Modal
      open={open}
      width={1000}
      centered
      footer={(node) => {
        return (
          <Flex justify="space-between">
            <Button
              onClick={() => setShowVariables((prev) => !prev)}
              data-testid="show-variables-button"
            >
              {showVariables
                ? formatMessage({ id: t('settings.emailTemplates.template') })
                : formatMessage({ id: t('settings.emailTemplates.variables') })}
            </Button>
            <Flex gap="4">{node}</Flex>
          </Flex>
        );
      }}
      title={
        <Flex
          data-testid="feature-modal-header"
          align="center"
          justify="space-between"
          w="100%"
          pr="10"
          css={css`
            width: 100%;
          `}
        >
          {isNew
            ? formatMessage({ id: t('settings.emailTemplates.newTemplate') })
            : formatMessage({ id: t('settings.emailTemplates.template') })}
        </Flex>
      }
      onOk={onOk}
      onCancel={onClose}
      cancelButtonProps={{
        'data-testid': 'modal-cancel-button',
      }}
      okButtonProps={{
        disabled: !isDirty,
        'data-testid': 'modal-submit-button',
      }}
      okText={formatMessage({ id: t('common.save') })}
    >
      <div css={s.container}>
        <ValidationAlert errors={formState.errors} />

        <Controller
          name="subject"
          control={control}
          render={({ field }) => {
            return (
              <Flex w="100%" direction="column">
                <Label required>
                  {formatMessage({ id: t('settings.emailTemplates.subject') })}
                </Label>
                <Input
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={formatMessage({ id: t('settings.emailTemplates.subject.placeholder') })}
                  data-testid="template-subject-input"
                />
              </Flex>
            );
          }}
        />
        <Controller
          name="body"
          control={control}
          render={({ field }) => {
            return (
              <Flex w="100%" h="calc(100% - 100px)" direction="column" mt="4">
                <Label required>
                  {formatMessage({ id: t('settings.emailTemplates.body') })}
                </Label>
                {showVariables ? (
                  <CodeEditor
                    onChange={() => {}}
                    value={variables}
                    theme="light"
                    language="json"
                  />
                ) : (
                  <CodeEditor
                    onChange={field.onChange}
                    value={field.value}
                    theme="light"
                  />
                )}
              </Flex>
            );
          }}
        />
      </div>
    </Modal>
  );
};
