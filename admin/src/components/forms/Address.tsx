import { Label } from '@components/forms/Label';
import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { Input } from 'antd';
import { Control, Controller } from 'react-hook-form';
import { FormattedMessage, useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

interface IAddressFormProps {
  control: Control<any>;
  name: string;
  disabled?: boolean;
  readOnly?: boolean;
}
export const AddressForm = ({
  control,
  name,
  disabled,
  readOnly,
}: IAddressFormProps) => {
  const { formatMessage } = useIntl();
  return (
    <Box>
      <Flex w="100%" gap="4">
        <Flex w="100%" gap="4">
          <Controller
            control={control}
            name={`${name}.firstName`}
            render={({ field, fieldState }) => {
              return (
                <Flex direction="column" grow="1">
                  <Label>
                    <FormattedMessage id={t('customers.information.firstName')} />
                  </Label>
                  <Input
                    disabled={disabled}
                    readOnly={readOnly}
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
        </Flex>
        <Flex w="100%" gap="4">
          <Controller
            control={control}
            name={`${name}.lastName`}
            render={({ field, fieldState }) => {
              return (
                <Flex direction="column" grow="1">
                  <Label>
                    <FormattedMessage id={t('customers.information.lastName')} />
                  </Label>
                  <Input
                    disabled={disabled}
                    readOnly={readOnly}
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
      </Flex>
      <Flex mt="4" gap="4" direction="column">
        <Controller
          control={control}
          name={`${name}.address1`}
          render={({ field, fieldState }) => {
            return (
              <Flex direction="column" grow="1">
                <Label>
                  <FormattedMessage id={t('customers.address.address1')} />
                </Label>
                <Input
                  disabled={disabled}
                  readOnly={readOnly}
                  value={field.value}
                  data-testid="address-line1-input"
                  onChange={field.onChange}
                  placeholder={formatMessage({ id: t('customers.address.address1.placeholder') })}
                  status={fieldState?.invalid ? 'error' : undefined}
                />
              </Flex>
            );
          }}
        />
        <Controller
          control={control}
          name={`${name}.address2`}
          render={({ field, fieldState }) => {
            return (
              <Flex direction="column" grow="1">
                <Label>
                  <FormattedMessage id={t('customers.address.address2')} />
                </Label>
                <Input
                  disabled={disabled}
                  readOnly={readOnly}
                  value={field.value}
                  data-testid="address-line2-input"
                  onChange={field.onChange}
                  placeholder={formatMessage({ id: t('customers.address.address2.placeholder') })}
                  status={fieldState?.invalid ? 'error' : undefined}
                />
              </Flex>
            );
          }}
        />
      </Flex>
      <Flex mt="4" gap="4">
        <Controller
          control={control}
          name={`${name}.countryCode`}
          render={({ field, fieldState }) => {
            return (
              <Flex direction="column" grow="1">
                <Label>
                  <FormattedMessage id={t('customers.address.country')} />
                </Label>
                <Input
                  disabled={disabled}
                  readOnly={readOnly}
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
        <Controller
          control={control}
          name={`${name}.city`}
          render={({ field, fieldState }) => {
            return (
              <Flex direction="column" grow="1">
                <Label>
                  <FormattedMessage id={t('customers.address.city')} />
                </Label>
                <Input
                  disabled={disabled}
                  readOnly={readOnly}
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
      </Flex>
      <Flex mt="4" gap="4">
        <Controller
          control={control}
          name={`${name}.provinceCode`}
          render={({ field, fieldState }) => {
            return (
              <Flex direction="column" grow="1">
                <Label>
                  <FormattedMessage id={t('customers.address.state')} />
                </Label>
                <Input
                  disabled={disabled}
                  readOnly={readOnly}
                  value={field.value}
                  data-testid="address-state-input"
                  onChange={field.onChange}
                  placeholder={formatMessage({ id: t('customers.address.state.placeholder') })}
                  status={fieldState?.invalid ? 'error' : undefined}
                />
              </Flex>
            );
          }}
        />
        <Controller
          control={control}
          name={`${name}.postalCode`}
          render={({ field, fieldState }) => {
            return (
              <Flex direction="column" grow="1">
                <Label>
                  <FormattedMessage id={t('customers.address.postalCode')} />
                </Label>
                <Input
                  disabled={disabled}
                  readOnly={readOnly}
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
      <Flex mt="4" gap="4" direction="column">
        <Controller
          control={control}
          name={`${name}.email`}
          render={({ field, fieldState }) => {
            return (
              <Flex direction="column" grow="1">
                <Label>
                  <FormattedMessage id={t('customers.information.email')} />
                </Label>
                <Input
                  disabled={disabled}
                  readOnly={readOnly}
                  value={field.value}
                  data-testid="address-country-input"
                  onChange={field.onChange}
                  placeholder={formatMessage({ id: t('customers.information.email.placeholder') })}
                  status={fieldState?.invalid ? 'error' : undefined}
                />
              </Flex>
            );
          }}
        />
        <Controller
          control={control}
          name={`${name}.phone`}
          render={({ field, fieldState }) => {
            return (
              <Flex direction="column" grow="1">
                <Label>
                  <FormattedMessage id={t('customers.information.phone')} />
                </Label>
                <Input
                  disabled={disabled}
                  readOnly={readOnly}
                  value={field.value}
                  data-testid="address-phone-input"
                  onChange={field.onChange}
                  placeholder={formatMessage({ id: t('customers.information.phone.placeholder') })}
                  status={fieldState?.invalid ? 'error' : undefined}
                />
              </Flex>
            );
          }}
        />
      </Flex>
    </Box>
  );
};
