import { Label } from '@components/forms/Label';
import { Flex } from '@components/utility/Flex';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { Button, Input } from 'antd';
import { Controller } from 'react-hook-form';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

export const Address = () => {
  const { formatMessage } = useIntl();
  if ('1') {
    return (
      <DrawerPaper>
        <DrawerPaperHeader
          title={formatMessage({ id: t('customers.address.title') })}
          extra={
            <Button disabled>
              {formatMessage({ id: t('customers.address.addAddress') })}
            </Button>
          }
        />
      </DrawerPaper>
    );
  }

  return (
    <DrawerPaper>
      <DrawerPaperHeader title={formatMessage({ id: t('customers.address.title') })} />
      <Flex>
        <Controller
          name="address.country"
          render={({ field, fieldState }) => {
            return (
              <Flex direction="column" grow="1">
                <Label>{formatMessage({ id: t('auth::label.email') })}</Label>
                <Input
                  value={field.value}
                  data-testid="address-country-input"
                  onChange={field.onChange}
                  placeholder={formatMessage({ id: t('customers.address.country.placeholder') })}
                  status={fieldState?.invalid ? 'error' : undefined}
                />
              </Flex>
            );
          }}
        />
      </Flex>
      <Flex mt="4" w="100%" gap="4">
        <Controller
          name="address.firstName"
          render={({ field, fieldState }) => {
            return (
              <Flex direction="column" grow="1">
                <Label>{formatMessage({ id: t('auth::label.firstName') })}</Label>
                <Input
                  value={field.value}
                  data-testid="first-name-input"
                  onChange={field.onChange}
                  placeholder={formatMessage({ id: t('customers.address.firstName.placeholder') })}
                  status={fieldState?.invalid ? 'error' : undefined}
                />
              </Flex>
            );
          }}
        />
        <Controller
          name="address.lastName"
          render={({ field, fieldState }) => {
            return (
              <Flex direction="column" grow="1">
                <Label>{formatMessage({ id: t('auth::label.lastName') })}</Label>
                <Input
                  value={field.value}
                  data-testid="last-name-input"
                  onChange={field.onChange}
                  placeholder={formatMessage({ id: t('customers.address.lastName.placeholder') })}
                  status={fieldState?.invalid ? 'error' : undefined}
                />
              </Flex>
            );
          }}
        />
      </Flex>
      <Flex mt="4">
        <Controller
          name="address.line1"
          render={({ field, fieldState }) => {
            return (
              <Flex direction="column" grow="1">
                <Label>{formatMessage({ id: t('customers.address.line1') })}</Label>
                <Input
                  value={field.value}
                  data-testid="address-line1-input"
                  onChange={field.onChange}
                  placeholder={formatMessage({ id: t('customers.address.line1.placeholder') })}
                  status={fieldState?.invalid ? 'error' : undefined}
                />
              </Flex>
            );
          }}
        />
      </Flex>

      <Flex mt="4">
        <Controller
          name="address.line2"
          render={({ field, fieldState }) => {
            return (
              <Flex direction="column" grow="1">
                <Label>{formatMessage({ id: t('customers.address.line2') })}</Label>
                <Input
                  value={field.value}
                  data-testid="address-line2-input"
                  onChange={field.onChange}
                  placeholder={formatMessage({ id: t('customers.address.line2.placeholder') })}
                  status={fieldState?.invalid ? 'error' : undefined}
                />
              </Flex>
            );
          }}
        />
      </Flex>
      <Flex mt="4" gap="4">
        <Controller
          name="address.city"
          render={({ field, fieldState }) => {
            return (
              <Flex direction="column" grow="1">
                <Label>{formatMessage({ id: t('customers.address.city') })}</Label>
                <Input
                  value={field.value}
                  data-testid="address-city-input"
                  onChange={field.onChange}
                  placeholder={formatMessage({ id: t('customers.address.city.placeholder') })}
                  status={fieldState?.invalid ? 'error' : undefined}
                />
              </Flex>
            );
          }}
        />
        <Controller
          name="address.postalCode"
          render={({ field, fieldState }) => {
            return (
              <Flex direction="column" grow="1">
                <Label>{formatMessage({ id: t('customers.address.postalCode') })}</Label>
                <Input
                  value={field.value}
                  data-testid="address-postal-code-input"
                  onChange={field.onChange}
                  placeholder={formatMessage({ id: t('customers.address.postalCode.placeholder') })}
                  status={fieldState?.invalid ? 'error' : undefined}
                />
              </Flex>
            );
          }}
        />
      </Flex>
      <Flex mt="4">
        <Controller
          name="address.phoneNumber"
          render={({ field, fieldState }) => {
            return (
              <Flex direction="column" grow="1">
                <Label>{formatMessage({ id: t('customers.address.phone') })}</Label>
                <Input
                  value={field.value}
                  data-testid="address-phone-input"
                  onChange={field.onChange}
                  placeholder={formatMessage({ id: t('customers.address.phone.placeholder') })}
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
