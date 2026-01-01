import { getUiFilterSelectProps } from '@components/forms/EntitySelect';
import { useLocales } from '@modules/locales/hooks/useLocales';
import { $locales } from '@modules/locales/store';
import { LocaleEnum } from '@src/entity/Locale/Locale';
import { UiFilter } from '@src/entity/UiFilter';
import { Select } from 'antd';
import { capitalize } from 'lodash';

export const UiFilterLocale = () => {
  return;
};

export const uiLocaleFilterValue = {
  label: 'Locale',
  payloadKey: 'locale',
  value: [],
  keyPath: [],
  type: UiFilter.UiFilterType.Locale,
  operator: UiFilter.uiLocaleFilterOperators[0],
} as UiFilter.IUiFilterValue;

export const UiFilterLocaleControl = () => {
  const { locale, locales } = useLocales();

  const onChange = (value: { key: LocaleEnum }) => {
    $locales.setLocale(value.key);
  };

  return (
    <Select
      placeholder="Locale"
      labelInValue
      onSelect={onChange}
      {...getUiFilterSelectProps([locale], { closable: false })}
      options={locales.map((it) => ({ label: it.title, value: it.code }))}
      value={[{ label: capitalize(locale.code), value: locale.code }]}
    />
  );
};
