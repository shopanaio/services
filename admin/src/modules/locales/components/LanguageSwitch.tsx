import { css } from '@emotion/react';
import { useLocales } from '@modules/locales/hooks/useLocales';
import { $locales } from '@modules/locales/store';
import { Radio } from 'antd';

interface ILanguageSwitchProps {
  showSingle?: boolean;
}

export const LanguageSwitch = ({ showSingle }: ILanguageSwitchProps) => {
  const { locales, locale } = useLocales();

  if (locales.length <= 1 && !showSingle) {
    return null;
  }

  return (
    <Radio.Group value={locale.code}>
      {locales.map((it) => (
        <Radio.Button
          key={it.code}
          value={it.code}
          type={locale.code === it.code ? 'primary' : 'default'}
          onClick={() => $locales.setLocale(it.code)}
        >
          <span
            data-testid={`language-radio-button-${it.code}`}
            css={css`
              display: inline-block;
              min-width: 16px;
              text-align: center;
            `}
          >
            {it.code}
          </span>
        </Radio.Button>
      ))}
    </Radio.Group>
  );
};
