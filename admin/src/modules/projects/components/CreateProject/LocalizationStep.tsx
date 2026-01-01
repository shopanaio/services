import { Helper } from '@components/forms/Helper';
import { Label } from '@components/forms/Label';
import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import {
  shopCountries,
  allowedCountries,
} from '@src/defs/localization/countries';
import {
  currencies,
  allowedCurrencies,
} from '@src/defs/localization/currencies';
import { shopLocales, allowedLocales } from '@src/defs/localization/locales';
import { Select, Tag, Typography } from 'antd';
import { Controller, useFormContext } from 'react-hook-form';
import type { CustomTagProps } from 'rc-select/lib/BaseSelect';
import { css } from '@emotion/react';
import { Navigation } from '@modules/projects/components/CreateProject/Navigation';
import { useCallback, useRef } from 'react';
import type { BaseSelectRef } from 'rc-select';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

export interface ILocalizationStepProps {
  onNext?: () => void;
  onPrev?: () => void;
}

export const LocalizationStep = ({
  onNext,
  onPrev,
}: ILocalizationStepProps) => {
  const { formatMessage } = useIntl();
  const selectRef = useRef<BaseSelectRef>();
  const { trigger, getValues } = useFormContext();

  const handleChange = useCallback(() => {
    selectRef.current?.blur();
  }, []);

  const onSubmit = async () => {
    if (await trigger()) {
      onNext?.();
    }
  };

  const tagRender = (props: CustomTagProps) => {
    const selectedItems = getValues('locales') as string[];
    const isFirst = selectedItems[0] === props.value;

    return (
      <Tag
        {...props}
        bordered
        color={isFirst ? 'blue' : undefined}
        css={css`
          height: 32px;
          margin-right: 3px;
          display: flex;
          align-items: center;
        `}
      >
        <Typography.Text strong={isFirst}>{props.label}</Typography.Text>
      </Tag>
    );
  };

  return (
    <>
      <Flex
        direction="column"
        align="center"
        grow="1"
        pt="10"
        data-testid="localization-step-container"
      >
        <Box>
          <Typography.Title level={4} data-testid="step-title">
            {formatMessage({ id: t('projects.localization.title') })}
          </Typography.Title>
        </Box>
        <Controller
          name="country"
          rules={{
            required: formatMessage({ id: t('projects.localization.country.required') }),
          }}
          render={({ field, fieldState }) => (
            <Box w="100%" mt="10">
              <Label required htmlFor="country-field">
                {formatMessage({ id: t('projects.localization.country.label') })}
              </Label>
              <Select
                value={field.value}
                onChange={field.onChange}
                showSearch
                style={{ width: '100%' }}
                status={fieldState.invalid ? 'error' : ''}
                size="large"
                id="country-field"
                placeholder={formatMessage({ id: t('projects.localization.country.placeholder') })}
                data-testid="country-field"
                options={shopCountries
                  .filter((it) => allowedCountries.includes(it.value))
                  .map((it) => ({ value: it.value, label: it.name }))
                  .sort((a, b) => a.label.localeCompare(b.label))}
              />
              <Helper data-testid="country-field-error">
                {fieldState.error?.message}
              </Helper>
            </Box>
          )}
        />
        <Controller
          name="locales"
          rules={{
            required: formatMessage({ id: t('projects.localization.languages.required') }),
          }}
          render={({ field, fieldState }) => (
            <Box w="100%" mt="6">
              <Label required htmlFor="locales-field">
                {formatMessage({ id: t('projects.localization.languages.label') })}
              </Label>
              <Select
                showSearch
                mode="multiple"
                value={field.value}
                ref={selectRef as any}
                onChange={(value) => {
                  handleChange();
                  field.onChange(value);
                }}
                style={{ width: '100%' }}
                status={fieldState.invalid ? 'error' : ''}
                size="large"
                id="locales-field"
                placeholder={formatMessage({ id: t('projects.localization.languages.placeholder') })}
                data-testid="language-field"
                options={shopLocales
                  .filter((it) => allowedLocales.includes(it.value))
                  .map((it) => ({ value: it.value, label: it.name }))
                  .sort((a, b) => a.label.localeCompare(b.label))}
                tagRender={tagRender}
              />
              <Helper data-testid="language-field-error">
                {fieldState.error?.message}
              </Helper>
            </Box>
          )}
        />
        <Controller
          name="currency"
          rules={{
            required: formatMessage({ id: t('projects.localization.currency.required') }),
          }}
          render={({ field, fieldState }) => (
            <Box w="100%" mt="6">
              <Label required htmlFor="currency-field">
                {formatMessage({ id: t('projects.localization.currency.label') })}
              </Label>
              <Select
                value={field.value}
                onChange={field.onChange}
                showSearch
                style={{ width: '100%' }}
                status={fieldState.invalid ? 'error' : ''}
                size="large"
                id="currency-field"
                placeholder={formatMessage({ id: t('projects.localization.currency.placeholder') })}
                data-testid="currency-field"
                options={currencies
                  .filter((it) => allowedCurrencies.includes(it.value))
                  .map((it) => ({ value: it.value, label: it.name }))
                  .sort((a, b) => a.label.localeCompare(b.label))}
              />
              <Helper data-testid="currency-field-error">
                {fieldState.error?.message}
              </Helper>
            </Box>
          )}
        />
      </Flex>
      <Navigation
        onPrev={onPrev}
        nextProps={{ onClick: onSubmit, children: formatMessage({ id: t('projects.navigation.finish') }) }}
      />
    </>
  );
};
