import { Helper } from '@components/forms/Helper';
import { Label } from '@components/forms/Label';
import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { allowedTimezones, timezones } from '@src/defs/localization/timezones';
import { IUser } from '@src/entity/User/User';
import { t } from '@src/lang/messages';
import { MdOutlineWarning, MdCheckCircle, MdLogout } from 'react-icons/md';
import { Button, Divider, Input, Select, Tooltip, Typography } from 'antd';
import { Controller, useForm } from 'react-hook-form';
import { FormattedMessage, useIntl } from 'react-intl';
import { UserAvatar } from '@modules/account/components/Avatar';
import { useMutation } from '@apollo/client';
import { shopLocales } from '@src/defs/localization/locales';
import { $session } from '@modules/auth/store/session';
import { FullLogo } from '@components/logo/FullLogo';
import { EmailForm } from '@modules/account/components/EmailForm';
import {
  ApiUserMutationCreateProfileResponse,
  CreateProfileMutation,
} from '@modules/account/graphql/createProfile';
import { routes } from '@modules/router/routes';
import { notify } from '@components/feedback/notification';

interface IAccountFormValues {
  firstName: string;
  lastName: string;
  timezone: string;
  language: string;
}

interface IAccountFormProps {
  user: IUser;
}

export const CreateAccountForm = ({ user }: IAccountFormProps) => {
  const { formatMessage } = useIntl();

  const [createProfile, { loading }] =
    useMutation<ApiUserMutationCreateProfileResponse>(CreateProfileMutation);

  const { control, handleSubmit, formState } = useForm({
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      timezone: user.timezone,
      language: user.language,
    } as IAccountFormValues,
  });

  const onSubmit = handleSubmit((values: IAccountFormValues) => {
    createProfile({
      onError: () => {
        notify.error(formatMessage({ id: t('account::error.genericError') }));
      },
      onCompleted: () => {
        window.location.assign(routes.stores.url);
      },
      variables: {
        input: {
          firstName: values.firstName,
          lastName: values.lastName,
          timezone: values.timezone,
          language: values.language,
        },
      },
    });
  });

  return (
    <form
      onSubmit={onSubmit}
      data-testid="create-profile-form"
      css={css`
        display: flex;
        flex-direction: column;
        height: 100%;
        flex-grow: 1;
      `}
    >
      <Flex justify="space-between" align="center" h="10" mb="10">
        <FullLogo size={20} />
        <Flex gap="4">
          <Button
            data-testid="logout-button"
            onClick={() => {
              $session.clearSession({ isFetched: true });
            }}
            icon={
              <MdLogout
                css={css`
                  transform: translateY(2px);
                `}
              />
            }
          >
            <FormattedMessage id={t('account::button.logout')} />
          </Button>
        </Flex>
      </Flex>
      <Flex>
        <Box minW="200px">
          <Typography.Text strong>
            <FormattedMessage id={t('account::section.general')} />
          </Typography.Text>
        </Box>
        <Box grow="1">
          <Flex align="center" gap="4">
            <UserAvatar size={64} />
          </Flex>
          <Divider />
          <Flex gap="4" mt="4">
            <Controller
              control={control}
              name="firstName"
              rules={{
                required: formatMessage({
                  id: t('account::error.firstName.required'),
                }),
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
                    type="text"
                    id="first-name-field"
                    data-testid="first-name-field"
                    placeholder={formatMessage({
                      id: t('auth::label.firstName'),
                    })}
                  />
                  <Helper>{fieldState.error?.message}</Helper>
                </Box>
              )}
            />
            <Controller
              control={control}
              name="lastName"
              rules={{
                required: formatMessage({
                  id: t('account::error.lastName.required'),
                }),
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
                    type="text"
                    id="last-name-field"
                    data-testid="last-name-field"
                    placeholder={formatMessage({
                      id: t('auth::label.lastName'),
                    })}
                  />
                  <Helper>{fieldState.error?.message}</Helper>
                </Box>
              )}
            />
          </Flex>
          <Divider />
          <Box
            css={css`
              display: grid;
              grid-template-columns: 2fr 1fr 1fr;
            `}
          >
            <Box>
              <Label>
                <FormattedMessage id={t('account::label.email')} />
              </Label>
              <Typography.Text strong>{user.email}</Typography.Text>
            </Box>
            <Box>
              {user.isVerified ? (
                <Flex
                  align="center"
                  gap="1"
                  data-testid="email-verified-indicator"
                >
                  <MdCheckCircle color="var(--color-green-6)" />
                  <Typography.Text
                    css={css`
                      color: var(--color-green-6);
                    `}
                  >
                    <FormattedMessage id={t('common.verified')} />
                  </Typography.Text>
                </Flex>
              ) : (
                <Tooltip
                  placement="topLeft"
                  title={formatMessage({
                    id: t('account::text.emailNotVerified'),
                  })}
                >
                  <Flex
                    align="center"
                    gap="1"
                    data-testid="email-pending-indicator"
                  >
                    <MdOutlineWarning color="var(--color-orange-6)" />
                    <Typography.Text
                      css={css`
                        color: var(--color-orange-6);
                      `}
                    >
                      <FormattedMessage id={t('account::text.pending')} />
                    </Typography.Text>
                  </Flex>
                </Tooltip>
              )}
            </Box>
            <Box
              css={css`
                margin-top: -6px;
              `}
            >
              <EmailForm isReadOnly />
            </Box>
          </Box>
        </Box>
      </Flex>
      <Divider />
      <Flex>
        <Box minW="200px">
          <Typography.Text strong>
            <FormattedMessage id={t('account::section.language')} />
          </Typography.Text>
        </Box>
        <Box grow="1">
          <Controller
            control={control}
            name="language"
            rules={{
              required: formatMessage({
                id: t('account::error.language.required'),
              }),
            }}
            render={({ field, fieldState }) => (
              <Box w="100%">
                <Label required htmlFor="language-field">
                  <FormattedMessage id={t('account::label.language')} />
                </Label>
                <Select
                  value={field.value}
                  onChange={field.onChange}
                  showSearch
                  style={{ width: '100%' }}
                  status={fieldState.invalid ? 'error' : ''}
                  id="language-field"
                  placeholder={formatMessage({
                    id: t('account::placeholder.selectLanguage'),
                  })}
                  data-testid="language-field"
                  options={shopLocales
                    .map((it) => ({ value: it.value, label: it.name }))
                    .sort((a, b) => a.label.localeCompare(b.label))}
                />
                <Helper>{fieldState.error?.message}</Helper>
              </Box>
            )}
          />
        </Box>
      </Flex>
      <Divider />
      <Flex>
        <Box minW="200px">
          <Typography.Text strong>
            <FormattedMessage id={t('account::section.timezone')} />
          </Typography.Text>
        </Box>
        <Box grow="1">
          <Controller
            control={control}
            name="timezone"
            rules={{
              required: formatMessage({
                id: t('account::error.timezone.required'),
              }),
            }}
            render={({ field, fieldState }) => (
              <Box w="100%">
                <Label required htmlFor="tz-field">
                  <FormattedMessage id={t('account::label.timezone')} />
                </Label>
                <Select
                  value={field.value}
                  onChange={field.onChange}
                  showSearch
                  style={{ width: '100%' }}
                  status={fieldState.invalid ? 'error' : ''}
                  id="tz-field"
                  data-testid="tz-field"
                  placeholder={formatMessage({
                    id: t('account::placeholder.selectTimezone'),
                  })}
                  options={timezones
                    .filter((it) => allowedTimezones.includes(it.value))
                    .map((it) => ({ value: it.value, label: it.name }))
                    .sort((a, b) => a.label.localeCompare(b.label))}
                />
                <Helper>{fieldState.error?.message}</Helper>
              </Box>
            )}
          />
        </Box>
      </Flex>
      <Button
        css={css`
          margin-top: auto;
        `}
        type="primary"
        data-testid="create-profile-button"
        htmlType="submit"
        loading={loading}
        block
        size="large"
      >
        <FormattedMessage id={t('account::button.createAccount')} />
      </Button>
    </form>
  );
};
