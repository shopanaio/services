import { IconButton } from '@components/IconButton';
import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { IProjectInfo } from '@src/entity/Project/Project';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { Typography } from 'antd';
import { MdCurrencyBitcoin } from 'react-icons/md';
import { useIntl, FormattedMessage } from 'react-intl';
import { t } from '@src/lang/messages';

export const StoreCurrencies = ({ project }: { project: IProjectInfo }) => {
  const { formatMessage } = useIntl();
  return (
    <DrawerPaper>
      <DrawerPaperHeader
        name="currencies"
        title={<FormattedMessage id={t('settings.currencies.title')} />}
      />
      <Flex direction="column" gap="4">
        <Flex align="center" gap="4">
          <MdCurrencyBitcoin size={20} />
          <Box>
            <Typography.Text type="secondary">
              <FormattedMessage id={t('settings.currencies.storeCurrency')} />
            </Typography.Text>
            <Box>
              <Typography.Text>USD ($)</Typography.Text>
            </Box>
          </Box>
        </Flex>
      </Flex>
    </DrawerPaper>
  );
};
