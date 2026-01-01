import { TableImage } from '@components/table/image';
import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { IMediaFile } from '@src/entity/MediaFile/MediaFile';

import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { Typography } from 'antd';
import { useIntl } from 'react-intl';

interface IVariantsGroupProps {
  title: string;
  cover: IMediaFile | null;
  variantsCount: number;
}

export const VariantsGroup = ({
  title,
  cover,
  variantsCount,
}: IVariantsGroupProps) => {
  const intl = useIntl();
  return (
    <DrawerPaper>
      <Flex gap="4" align="center">
        <TableImage file={cover} size={50} />
        <Box>
          <Typography.Text strong>{title}</Typography.Text>
          <Box>
            <Typography.Text type="secondary">
              {intl.formatMessage(
                { id: 'product.variantsCount' },
                { count: variantsCount },
              )}
            </Typography.Text>
          </Box>
        </Box>
      </Flex>
    </DrawerPaper>
  );
};
