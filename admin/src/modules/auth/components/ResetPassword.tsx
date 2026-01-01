import { Box } from '@components/utility/Box';
import { css } from '@emotion/react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { HiLockClosed } from 'react-icons/hi2';
import { MdOutlineVisibility, MdOutlineVisibilityOff } from 'react-icons/md';
import { Alert, Button, Flex, Input, Typography, Space } from 'antd';
import { Helper } from '@components/forms/Helper';
import { Label } from '@components/forms/Label';
import { FormattedMessage, useIntl } from 'react-intl';
import { t } from '@src/lang/messages';
const { Title } = Typography;

const useResetPassword = () => {
  // const router = useRouter();

  // const code = useRef<string>();
  const [error, setError] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  // const startSession = useSetSession(); todo

  const { control, handleSubmit } = useForm({
    defaultValues: {
      password: '',
    },
  });

  useEffect(() => {
    // if (!router.query.code) {
    // router.push("/");
    return;
    // }

    // if (typeof router.query.code === 'string') {
    // code.current = router.query.code;
    // router.replace(APP_ROUTES.resetPassword(), undefined, { shallow: true });
    // }
  }, []);

  const onSubmit = handleSubmit(async () => {
    try {
      // TODO
      // const response = await Fetcher.post<{ user: IUser; jwt: string }>(
      //   API_ROUTES.resetPassword(),
      //   {
      //     code: code.current,
      //     password: values.password,
      //     passwordConfirmation: values.password,
      //   },
      // );
      // if (!response?.user) {
      //   throw new Error();
      // }
      // setError(false);
      // router.push('/');
      // startSession(response);
    } catch {
      setError(true);
    }
  });

  return {
    control,
    error,
    onSubmit,
    passwordVisible,
    togglePasswordVisibility: () => setPasswordVisible((prev) => !prev),
  };
};

export const ResetPassword = () => {
  const { formatMessage } = useIntl();
  const {
    control,
    error,
    onSubmit,
    passwordVisible,
    togglePasswordVisibility,
  } = useResetPassword();

  return (
    <Box
      css={css`
        padding: var(--x3);
        margin: var(--x10) auto 0;
        max-width: 400px;
      `}
    >
      <Flex align="center" justify-content="center">
        <HiLockClosed
          size={24}
          color="var(--color-gray-7)"
          css={css`
            margin-top: -2px;
          `}
        />
        <Title>
          <FormattedMessage id={t('auth::password-reset.page.title')} />
        </Title>
      </Flex>
      <form onSubmit={onSubmit} data-testid="reset-password-form">
        <Controller
          control={control}
          name="password"
          rules={{
            required: formatMessage({ id: t('auth.error.password.required') }),
            minLength: {
              value: 6,
              message: formatMessage({
                id: t('auth.error.password.tooShort'),
              }),
            },
          }}
          render={({ field, fieldState }) => (
            <Box>
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
                  placeholder={formatMessage({ id: t('auth::label.password') })}
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
              <Helper>{fieldState.error?.message}</Helper>
            </Box>
          )}
        />
        {error && (
          <Box mb="2">
            <Alert
              type="error"
              message={formatMessage({
                id: t('auth::text.somethingWentWrong'),
              })}
            />
          </Box>
        )}
        <Box mt="2">
          <Button block type="primary" onClick={onSubmit} size="large">
            <FormattedMessage id={t('auth::button.resetPassword')} />
          </Button>
        </Box>
        {error && (
          <Alert
            type="error"
            message={formatMessage({
              id: t('auth::text.somethingWentWrong'),
            })}
          />
        )}
      </form>
    </Box>
  );
};
