import { IconButton } from '@components/IconButton';
import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { Typography } from 'antd';
import { TbRulerMeasure } from 'react-icons/tb';
import { RiSpeedUpFill } from 'react-icons/ri';
import { IProjectInfo } from '@src/entity/Project/Project';
import { useIntl, FormattedMessage } from 'react-intl';
import { t } from '@src/lang/messages';

export const StoreUnits = () => {
  const { formatMessage } = useIntl();
  return (
    <DrawerPaper>
      <DrawerPaperHeader
        name="units"
        title={<FormattedMessage id={t('settings.units.title')} />}
      />
      <Flex direction="column" gap="4">
        <Flex align="center" gap="4">
          <TbRulerMeasure size={20} />
          <Box>
            <Typography.Text type="secondary">
              <FormattedMessage id={t('settings.units.system')} />
            </Typography.Text>
            <Box>
              <Typography.Text>
                <FormattedMessage id={t('settings.units.metric')} />
              </Typography.Text>
            </Box>
          </Box>
        </Flex>
        <Flex align="center" gap="4">
          <RiSpeedUpFill size={20} />
          <Box>
            <Typography.Text type="secondary">
              <FormattedMessage id={t('settings.units.weight')} />
            </Typography.Text>
            <Box>
              <Typography.Text>
                <FormattedMessage id={t('settings.units.kg')} />
              </Typography.Text>
            </Box>
          </Box>
        </Flex>
      </Flex>
    </DrawerPaper>
  );
};
