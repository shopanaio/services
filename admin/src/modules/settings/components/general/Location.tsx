import { IconButton } from '@components/IconButton';
import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { IProjectInfo } from '@src/entity/Project/Project';

import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { Typography } from 'antd';

import { GrMapLocation } from 'react-icons/gr';
import { RiMapPinTimeLine } from 'react-icons/ri';
import { useIntl, FormattedMessage } from 'react-intl';
import { t } from '@src/lang/messages';

export const StoreLocation = ({ project }: { project: IProjectInfo }) => {
  const { formatMessage } = useIntl();
  return (
    <DrawerPaper>
      <DrawerPaperHeader
        name="location"
        title={<FormattedMessage id={t('settings.location.title')} />}
      />
      <Flex direction="column" gap="4">
        <Flex align="center" gap="4">
          <GrMapLocation size={20} />
          <Box>
            <Typography.Text type="secondary">
              <FormattedMessage id={t('settings.location.country')} />
            </Typography.Text>
            <Box>
              <Typography.Text>{project.country}</Typography.Text>
            </Box>
          </Box>
        </Flex>
        <Flex align="center" gap="4">
          <RiMapPinTimeLine size={20} />
          <Box>
            <Typography.Text type="secondary">
              <FormattedMessage id={t('settings.location.timezone')} />
            </Typography.Text>
            <Box>
              <Typography.Text>{project.timezone}</Typography.Text>
            </Box>
          </Box>
        </Flex>
      </Flex>
    </DrawerPaper>
  );
};
