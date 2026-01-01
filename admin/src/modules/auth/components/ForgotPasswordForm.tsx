import { Box } from '@components/utility/Box';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Button, Input, Typography } from 'antd';
import { css } from '@emotion/react';
import { Helper } from '@components/forms/Helper';
import { Label } from '@components/forms/Label';
import { FormattedMessage, useIntl } from 'react-intl';
import { t } from '@src/lang/messages';
import { Flex } from '@components/utility/Flex';
import { useForgotPassword } from '@modules/auth/hooks/useForgotPassword';
const { Text, Title, Link } = Typography;

interface IForgotPasswordFormProps {
  onSignIn: () => void;
}

export const ForgotPasswordForm = ({ onSignIn }: IForgotPasswordFormProps) => {
  const { formatMessage } = useIntl();

  const { control, error, onSubmit, loading, success } = useForgotPassword();

  return (
    <form onSubmit={onSubmit} data-testid="forgot-password-form">
      <Box mb="10">
        <Flex align="center" justify-content="center" direction="column">
          <Title level={3}>
            <FormattedMessage id={t('auth::password-recovery.title')} />
          </Title>
          <Text
            css={css`
              padding-top: 8px;
            `}
          >
            <FormattedMessage id={t('auth::password-recovery.subtitle')} />
          </Text>
        </Flex>
      </Box>
      <Controller
        control={control}
        name="email"
        rules={{
          required: formatMessage({ id: t('auth.error.email.required') }),
          pattern: {
            value: /.+@.+\..+/,
            message: formatMessage({ id: t('auth.error.email.invalid') }),
          },
        }}
        render={({ field, fieldState }) => (
          <Box>
            <Label required htmlFor="email-field">
              <FormattedMessage id={t('auth::label.email')} />
            </Label>
            <Input
              value={field.value}
              onChange={field.onChange}
              status={fieldState.invalid ? 'error' : ''}
              size="large"
              type="text"
              id="email-field"
              data-testid="email-field"
              placeholder={formatMessage({ id: t('auth::label.email') })}
              disabled={success}
            />
            <Helper data-testid="email-field-error">
              {fieldState.error?.message}
            </Helper>
          </Box>
        )}
      />
      {success ? (
        <Box mt="4">
          <Alert
            type="success"
            message={formatMessage({
              id: t('auth::text.checkYourInbox'),
            })}
            data-testid="alert-success"
          />
        </Box>
      ) : (
        <Flex
          direction="column"
          gap="4"
          css={css`
            width: 100%;
          `}
        >
          {error && (
            <Box mt="4">
              <Alert
                type="error"
                message={formatMessage({
                  id: t('auth::text.somethingWentWrong'),
                })}
                data-testid="alert-error"
              />
            </Box>
          )}
          <Box mt={error ? '4' : '6'}>
            <Button
              loading={loading}
              block
              type="primary"
              onClick={onSubmit}
              size="large"
            >
              <FormattedMessage id={t('auth::button.send')} />
            </Button>
          </Box>
          <Box>
            <Button
              block
              type="link"
              onClick={onSignIn}
              size="large"
              data-testid="submit-button"
            >
              <Flex gap="4" justify="center">
                <Text>
                  <FormattedMessage
                    id={t('auth::button.rememberYourPassword')}
                  />
                </Text>
                <Link>
                  <FormattedMessage id={t('auth::button.signIn')} />
                </Link>
              </Flex>
            </Button>
          </Box>
        </Flex>
      )}
    </form>
  );
};
