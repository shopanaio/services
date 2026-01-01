import { Input, Tag } from 'antd';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

export const TranslateInput = ({
  label,
  name,
  value,
  onChange,
  ['data-testid']: dataTestId,
}: {
  label?: string | false;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  ['data-testid']: string;
}) => {
  const intl = useIntl();
  return (
    <Input
      styles={{
        affixWrapper: { paddingInline: '4px' },
      }}
      prefix={
        typeof label === 'string' ? (
          <Tag>
            {label ||
              intl.formatMessage({ id: t('translations.noTranslation') })}
          </Tag>
        ) : null
      }
      placeholder={intl.formatMessage({
        id: t('translations.enterTranslation'),
      })}
      name={name}
      value={value}
      onChange={onChange}
      data-testid={dataTestId}
    />
  );
};
