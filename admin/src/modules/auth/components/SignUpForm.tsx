import { Box } from '@components/utility/Box';
import { css } from '@emotion/react';
import { useRegister } from '@modules/auth/hooks/useRegister';
import { Controller } from 'react-hook-form';
import { MdOutlineVisibility, MdOutlineVisibilityOff } from 'react-icons/md';

import { Alert, Button, Input, Typography, Space, Divider } from 'antd';
import { Helper } from '@components/forms/Helper';
import { Label } from '@components/forms/Label';
import { FormattedMessage, useIntl } from 'react-intl';
import { t } from '@src/lang/messages';
import { Flex } from '@components/utility/Flex';
import { GoogleAuthButton } from '@modules/auth/components/GoogleAuthButton';

const { Title } = Typography;

export const SignUpForm = () => {
  const { formatMessage } = useIntl();

  const {
    control,
    error,
    loading,
    onSubmit,
    passwordVisible,
    togglePasswordVisibility,
  } = useRegister();

  return (
    <form onSubmit={onSubmit} data-testid="sign-up-form">
      <Box mb="10">
        <Flex align="center" justify-content="center" direction="column">
          <Title level={3}>
            <FormattedMessage id={t('auth::sign-up.title')} />
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
              status={fieldState.invalid ? 'error' : ''}
              size="large"
              name="email"
              type="text"
              id="email-field"
              data-testid="email-field"
              placeholder={formatMessage({
                id: t('auth::label.email'),
              })}
            />
            <Helper data-testid="email-field-error">
              {fieldState.error?.message}
            </Helper>
          </Box>
        )}
      />
      <Flex gap="6" mt="4">
        <Controller
          control={control}
          name="firstName"
          rules={{
            required: formatMessage({ id: t('auth.error.firstName.required') }),
          }}
          render={({ field, fieldState }) => (
            <Box>
              <Label required htmlFor="first-name-field">
                <FormattedMessage id={t('auth::label.firstName')} />
              </Label>
              <Input
                value={field.value}
                onChange={field.onChange}
                status={fieldState.invalid ? 'error' : ''}
                size="large"
                type="text"
                name="firstName"
                id="first-name-field"
                data-testid="first-name-field"
                placeholder={formatMessage({
                  id: t('auth::label.firstName'),
                })}
              />
              <Helper data-testid="first-name-field-error">
                {fieldState.error?.message}
              </Helper>
            </Box>
          )}
        />
        <Controller
          control={control}
          name="lastName"
          rules={{
            required: formatMessage({ id: t('auth.error.lastName.required') }),
          }}
          render={({ field, fieldState }) => (
            <Box>
              <Label required htmlFor="last-name-field">
                <FormattedMessage id={t('auth::label.lastName')} />
              </Label>
              <Input
                value={field.value}
                onChange={field.onChange}
                status={fieldState.invalid ? 'error' : ''}
                size="large"
                type="text"
                name="lastName"
                id="last-name-field"
                data-testid="last-name-field"
                placeholder={formatMessage({
                  id: t('auth::label.lastName'),
                })}
              />
              <Helper data-testid="last-name-field-error">
                {fieldState.error?.message}
              </Helper>
            </Box>
          )}
        />
      </Flex>
      <Controller
        control={control}
        name="password"
        rules={{
          required: formatMessage({ id: t('auth.error.password.required') }),
          minLength: {
            value: 6,
            message: formatMessage({ id: t('auth.error.password.tooShort') }),
          },
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
      <Space
        size="small"
        direction="vertical"
        css={css`
          width: 100%;
        `}
      >
        {error && (
          <Box mt="4" data-testid="error-alert">
            <Alert
              type="error"
              message={formatMessage({
                id: t('auth::text.somethingWentWrong'),
              })}
            />
          </Box>
        )}
        <Box mt={error ? '4' : '8'}>
          <Button
            block
            type="primary"
            onClick={onSubmit}
            size="large"
            loading={loading}
            data-testid="submit-button"
          >
            <FormattedMessage id={t('auth::button.signUp')} />
          </Button>
        </Box>
      </Space>
    </form>
  );
};
