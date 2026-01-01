import { Box } from '@components/utility/Box';
import { css } from '@emotion/react';
import { useLogin } from '@modules/auth/hooks/useLogin';
import { Alert, Button, Input, Typography, Space, Switch, Divider } from 'antd';
import { Helper } from '@components/forms/Helper';
import { Label } from '@components/forms/Label';
const { Text, Link, Title } = Typography;

import { Controller } from 'react-hook-form';
import { AiOutlineLock, AiOutlineUser } from 'react-icons/ai';
import { MdOutlineVisibility, MdOutlineVisibilityOff } from 'react-icons/md';
import { Flex } from '@components/utility/Flex';
import { FormattedMessage, useIntl } from 'react-intl';
import { t } from '@src/lang/messages';
import { GoogleAuthButton } from '@modules/auth/components/GoogleAuthButton';

interface ISignInFormProps {
  onForgotPassword: () => void;
}

export const SignInForm = ({ onForgotPassword }: ISignInFormProps) => {
  const { formatMessage } = useIntl();
  const {
    control,
    error,
    loading,
    onSubmit,
    passwordVisible,
    togglePasswordVisibility,
  } = useLogin();

  return (
    <form onSubmit={onSubmit} data-testid="sign-in-form">
      <Box mb="10">
        <Flex align="center" justify-content="center" direction="column">
          <Title level={3}>
            <FormattedMessage id={t('auth::sign-in.title')} />
          </Title>
        </Flex>
      </Box>
      <GoogleAuthButton />
      <Divider>
        <Typography.Text type="secondary">
          <FormattedMessage id={t('auth::button.or')} />
        </Typography.Text>
      </Divider>
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
              prefix={<AiOutlineUser />}
              status={fieldState.invalid ? 'error' : ''}
              size="large"
              type="text"
              name="email"
              id="email-field"
              data-testid="email-field"
              placeholder={formatMessage({ id: t('auth::label.email') })}
            />
            <Helper data-testid="email-field-error">
              {fieldState.error?.message}
            </Helper>
          </Box>
        )}
      />
      <Controller
        control={control}
        name="password"
        rules={{
          required: formatMessage({ id: t('auth.error.password.required') }),
        }}
        render={({ field, fieldState }) => (
          <Box mt="4">
            <Label required htmlFor="password-field">
              <FormattedMessage id={t('auth::label.password')} />
            </Label>
            <Space.Compact
              size="large"
              css={css`
                width: 100%;
              `}
            >
              <Input
                value={field.value}
                onChange={field.onChange}
                prefix={<AiOutlineLock />}
                status={fieldState.invalid ? 'error' : ''}
                type={passwordVisible ? 'text' : 'password'}
                id="password-field"
                name="password"
                data-testid="password-field"
                placeholder={formatMessage({
                  id: t('auth::label.password'),
                })}
              />
              <Button
                onClick={togglePasswordVisibility}
                danger={fieldState.invalid}
                icon={
                  passwordVisible ? (
                    <MdOutlineVisibility />
                  ) : (
                    <MdOutlineVisibilityOff />
                  )
                }
              />
            </Space.Compact>
            <Helper data-testid="password-field-error">
              {fieldState.error?.message}
            </Helper>
          </Box>
        )}
      />

      <Flex justify="space-between" align="center" mt="5">
        <Flex align="center" gap="2" as="label">
          <Controller
            control={control}
            name="isPersistent"
            render={({ field }) => (
              <Switch
                checked={field.value}
                onChange={field.onChange}
                id="remember-field"
                data-testid="remember-field"
              />
            )}
          />
          <Text>
            <FormattedMessage id={t('auth::label.rememberMe')} />
          </Text>
        </Flex>
        <Link onClick={onForgotPassword}>
          <FormattedMessage id={t('auth::button.forgotPassword')} />
        </Link>
      </Flex>
      {error && (
        <Box mt="4">
          <Alert
            type="error"
            message={formatMessage({
              id: t('auth::text.incorrectEmailOrPassword'),
            })}
            data-testid="error-alert"
          />
        </Box>
      )}
      <Box mt={error ? '4' : '8'}>
        <Button
          block
          loading={loading}
          type="primary"
          onClick={onSubmit}
          size="large"
          data-testid="submit-button"
        >
          <FormattedMessage id={t('auth::button.signIn')} />
        </Button>
      </Box>
    </form>
  );
};
