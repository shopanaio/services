import { Label } from '@components/forms/Label';
import { Flex } from '@components/utility/Flex';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { Input, Switch, Typography } from 'antd';
import { Controller } from 'react-hook-form';
import { NumericFormat } from 'react-number-format';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

export const Information = () => {
  const { formatMessage } = useIntl();

  return (
    <DrawerPaper>
      <DrawerPaperHeader
        title={formatMessage({ id: t('customers.information.title') })}
        name="info"
      />
      <Flex w="100%" gap="4">
        <Controller
          name="firstName"
          render={({ field, fieldState }) => {
            return (
              <Flex direction="column" grow="1">
                <Label required>{formatMessage({ id: t('auth::label.firstName') })}</Label>
                <Input
                  value={field.value}
                  data-testid="first-name-input"
                  onChange={field.onChange}
                  placeholder={formatMessage({ id: t('customers.information.firstName.placeholder') })}
                  status={fieldState?.invalid ? 'error' : undefined}
                />
              </Flex>
            );
          }}
        />
        <Controller
          name="lastName"
          render={({ field, fieldState }) => {
            return (
              <Flex direction="column" grow="1">
                <Label required>{formatMessage({ id: t('auth::label.lastName') })}</Label>
                <Input
                  value={field.value}
                  data-testid="last-name-input"
                  onChange={field.onChange}
                  placeholder={formatMessage({ id: t('customers.information.lastName.placeholder') })}
                  status={fieldState?.invalid ? 'error' : undefined}
                />
              </Flex>
            );
          }}
        />
      </Flex>
      <Flex mt="4" gap="4" align="flex-end" w="100%">
        <Controller
          name="email"
          render={({ field, fieldState }) => {
            return (
              <Flex direction="column" grow="1">
                <Label required>{formatMessage({ id: t('auth::label.email') })}</Label>
                <Input
                  value={field.value}
                  data-testid="email-input"
                  onChange={field.onChange}
                  placeholder={formatMessage({ id: t('customers.information.email.placeholder') })}
                  status={fieldState?.invalid ? 'error' : undefined}
                />
              </Flex>
            );
          }}
        />
      </Flex>
      <Flex mt="4">
        <Controller
          name="isEmailVerified"
          render={({ field: { value, onChange } }) => (
            <Flex as="label" grow="1" gap="2" align="center">
              <Switch
                size="small"
                data-testid="verify-email-switch"
                checked={value}
                onChange={onChange}
              />
              <Typography.Text>{formatMessage({ id: t('common.verified') })}</Typography.Text>
            </Flex>
          )}
        />
      </Flex>
      <Flex mt="4">
        <Controller
          name="password"
          render={({ field, fieldState }) => {
            return (
              <Flex direction="column" grow="1">
                <Label required>{formatMessage({ id: t('customers.information.password') })}</Label>
                <Input.Password
                  value={field.value}
                  data-testid="password-input"
                  onChange={field.onChange}
                  placeholder={formatMessage({ id: t('customers.information.password.placeholder') })}
                  status={fieldState?.invalid ? 'error' : undefined}
                />
              </Flex>
            );
          }}
        />
      </Flex>
      <Flex mt="4">
        <Controller
          name="phone"
          render={({ field, fieldState }) => {
            return (
              <Flex direction="column" grow="1">
                <Label>{formatMessage({ id: t('customers.information.phone') })}</Label>
                <NumericFormat
                  value={field.value}
                  data-testid="phone-number-input"
                  onChange={field.onChange}
                  placeholder={formatMessage({ id: t('customers.information.phone.placeholder') })}
                  customInput={Input}
                  status={fieldState?.invalid ? 'error' : undefined}
                />
              </Flex>
            );
          }}
        />
      </Flex>
    </DrawerPaper>
  );
};
