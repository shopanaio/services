import { Label } from '@components/forms/Label';
import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { Switch, Typography } from 'antd';
import { Controller } from 'react-hook-form';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

export const Marketing = () => {
  const { formatMessage } = useIntl();
  return (
    <DrawerPaper>
      <DrawerPaperHeader title={formatMessage({ id: t('customers.marketing.title') })} name="marketing" />
      <Flex>
        <Controller
          name="marketing.email"
          render={({ field: { value, onChange } }) => (
            <Label>
              <Flex gap="2" align="center">
                <Switch
                  disabled
                  data-testid="track-quantity-switch"
                  checked={value}
                  onChange={onChange}
                  size="small"
                />
                <Typography.Text>{formatMessage({ id: t('customers.marketing.emailEnabled') })}</Typography.Text>
              </Flex>
            </Label>
          )}
        />
      </Flex>
      <Flex mt="2">
        <Controller
          name="marketing.sms"
          render={({ field: { value, onChange } }) => (
            <Label>
              <Flex gap="2" align="center">
                <Switch
                  disabled
                  data-testid="track-quantity-switch"
                  checked={value}
                  onChange={onChange}
                  size="small"
                />
                <Typography.Text>{formatMessage({ id: t('customers.marketing.smsEnabled') })}</Typography.Text>
              </Flex>
            </Label>
          )}
        />
      </Flex>
      <Box mt="2">
        <Typography.Text type="secondary">{formatMessage({ id: t('customers.marketing.consentHint') })}</Typography.Text>
      </Box>
    </DrawerPaper>
  );
};
