import { Helper } from '@components/forms/Helper';
import { Label } from '@components/forms/Label';
import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { allowedTimezones, timezones } from '@src/defs/localization/timezones';
import { IUser } from '@src/entity/User/User';
import { t } from '@src/lang/messages';
import {
  MdOutlineWarning,
  MdCheckCircle,
  MdLogout,
  MdArrowBack,
} from 'react-icons/md';
import {
  Alert,
  Button,
  Divider,
  Input,
  Modal,
  Select,
  Tooltip,
  Typography,
} from 'antd';
import { Controller, useForm } from 'react-hook-form';
import { FormattedMessage, useIntl } from 'react-intl';
import { UserAvatar } from '@modules/account/components/Avatar';
import { useMutation } from '@apollo/client';
import {
  UpdateProfileMutation,
  ApiUserMutationUpdateProfileResponse,
} from '@modules/account/graphql/updateProfile';
import { allowedLocales, shopLocales } from '@src/defs/localization/locales';
import { router } from '@modules/router/router';
import { routes } from '@modules/router/routes';
import { $session } from '@modules/auth/store/session';
import { FullLogo } from '@components/logo/FullLogo';
import { EmailForm } from '@modules/account/components/EmailForm';
import { PasswordForm } from '@modules/account/components/PasswordForm';
import { ApiUserMutationUpdateProfileArgs } from '@src/graphql';
import { Paper } from '@components/paper/Paper';
import { useState } from 'react';
import { DeleteAccountMutation } from '@modules/account/graphql/delete';
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

export const AccountForm = ({ user }: IAccountFormProps) => {
  const { formatMessage } = useIntl();
  const [deleteAccountModalOpen, setDeleteAccountModalOpen] = useState(false);

  const [updateProfile, { loading }] = useMutation<
    ApiUserMutationUpdateProfileResponse,
    ApiUserMutationUpdateProfileArgs
  >(UpdateProfileMutation);

  const [
    deleteAccount,
    { error: deleteAccountError, loading: deleteAccountLoading },
  ] = useMutation(DeleteAccountMutation, {
    onCompleted: () => {
      $session.clearSession({ isFetched: true });
      window.location.reload();
    },
  });

  const { control, handleSubmit, formState, reset } = useForm({
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      timezone: user.timezone,
      language: user.language,
    } as IAccountFormValues,
  });

  const onSubmit = handleSubmit((values: IAccountFormValues) => {
    updateProfile({
      onError: () => {
        notify.error(formatMessage({ id: t('account::error.genericError') }));
      },
      onCompleted: () => {
        reset(values);
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
    <form onSubmit={onSubmit} data-testid="update-profile-form">
      <Flex justify="space-between" align="center" h="10" mb="10">
        <FullLogo size={20} noText />
        <Flex gap="4">
          <Button
            icon={
              <MdArrowBack
                css={css`
                  transform: translateY(2px);
                `}
              />
            }
            type="link"
            data-testid="stores-button"
            onClick={() => {
              router.navigate(routes.stores.link);
            }}
          >
            <FormattedMessage id={t('account::button.backToStores')} />
          </Button>

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
          <Button
            data-testid="update-profile-button"
            disabled={!formState.isDirty}
            htmlType="submit"
            loading={loading}
          >
            <FormattedMessage id={t('account::button.save')} />
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
            <UserAvatar size={64} user={user} />
            {/* <Button>Update image</Button> TODO */}
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
          <Box>
            <Flex w="100%" justify="space-between">
              <Label>
                <FormattedMessage id={t('account::label.email')} />
              </Label>

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
            </Flex>
            <Typography.Text strong>{user.email}</Typography.Text>
          </Box>
        </Box>
      </Flex>
      <Divider />
      <Flex>
        <Box minW="200px">
          <Typography.Text strong>
            <FormattedMessage id={t('account::section.password')} />
          </Typography.Text>
        </Box>
        <Box grow="1">
          <PasswordForm />
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
      <Paper
        css={css`
          margin-top: var(--x6);
          padding: var(--x4);
          border: 1px solid var(--color-red-6);
        `}
      >
        <Flex justify="space-between" align="center">
          <Flex direction="column">
            <Typography.Text strong>
              <FormattedMessage id={t('account::button.deleteMyAccount')} />
            </Typography.Text>
            <Typography.Text>
              <FormattedMessage id={t('account::text.deleteAccountWarning')} />
            </Typography.Text>
          </Flex>
          <Button
            danger
            ghost
            onClick={() => {
              setDeleteAccountModalOpen(true);
            }}
          >
            <FormattedMessage id={t('account::button.deleteMyAccount')} />
          </Button>
        </Flex>
      </Paper>
      {deleteAccountError && (
        <Box mt="4">
          <Alert
            type="error"
            showIcon
            message={formatMessage({
              id: t('account::error.deleteAccountError'),
            })}
            description={formatMessage({
              id: t('account::error.deleteAccountDescription'),
            })}
          />
        </Box>
      )}
      <Modal
        footer={null}
        open={deleteAccountModalOpen}
        onCancel={() => setDeleteAccountModalOpen(false)}
        transitionName="ant-fade"
        maskTransitionName="ant-fade"
      >
        <Flex direction="column" align="center" w="100%">
          <Box mb="4">
            <UserAvatar size={48} user={user} />
          </Box>
          <Typography.Title level={4}>{user.email}</Typography.Title>
          <Typography.Text>
            <FormattedMessage id={t('account::text.deleteAccountConfirm')} />
          </Typography.Text>
        </Flex>

        <Flex direction="column" gap="3" mt="4">
          <Button
            danger
            block
            ghost
            loading={deleteAccountLoading}
            onClick={() => {
              deleteAccount();
            }}
          >
            <FormattedMessage id={t('account::button.deleteMyAccount')} />
          </Button>
        </Flex>
      </Modal>
    </form>
  );
};
