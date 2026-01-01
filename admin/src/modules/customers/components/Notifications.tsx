import { Label } from '@components/forms/Label';
import { Box } from '@components/utility/Box';
import { shopLocales } from '@src/defs/localization/locales';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { Select, Typography } from 'antd';
import { Controller } from 'react-hook-form';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

export const Notification = () => {
  const { formatMessage } = useIntl();
  return (
    <DrawerPaper>
      <DrawerPaperHeader title={formatMessage({ id: t('customers.notifications.title') })} name="notification" />
      <Box grow="1">
        <Controller
          name="language"
          render={({ field, fieldState }) => (
            <Box w="100%">
              <Label required htmlFor="language-field">{formatMessage({ id: t('customers.notifications.language') })}</Label>
              <Select
                value={field.value}
                onChange={field.onChange}
                showSearch
                style={{ width: '100%' }}
                status={fieldState.invalid ? 'error' : ''}
                id="language-field"
                placeholder={formatMessage({ id: t('customers.notifications.language.placeholder') })}
                data-testid="language-field"
                options={shopLocales
                  .map((it) => ({ value: it.value, label: it.name }))
                  .sort((a, b) => a.label.localeCompare(b.label))}
              />
            </Box>
          )}
        />
      </Box>
      <Box mt="2">
        <Typography.Text type="secondary">{formatMessage({ id: t('customers.notifications.hint') })}</Typography.Text>
      </Box>
    </DrawerPaper>
  );
};
