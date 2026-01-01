import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { IProductVariantOption } from '@src/entity/Product/Variant';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { Typography } from 'antd';
import { FormattedMessage } from 'react-intl';

interface IVariantOptionsProps {
  options: IProductVariantOption[];
}

export const VariantOptions = ({ options }: IVariantOptionsProps) => {
  return (
    <DrawerPaper>
      <DrawerPaperHeader
        title={<FormattedMessage id="products.options.title" />}
        name="options"
      />
      <Box>
        {options?.map((it, idx) => (
          <Flex
            justify="space-between"
            wrap="nowrap"
            key={it.id}
            style={{
              paddingTop: idx === 0 ? 0 : 'var(--x2)',
              paddingBottom: idx === options.length - 1 ? 0 : 'var(--x2)',
              borderBottom: `1px solid var(--color-gray-3)`,
              ...(idx === options.length - 1 && {
                borderBottom: 'none',
              }),
            }}
          >
            <Typography.Text strong>{it?.group?.title || ''}</Typography.Text>
            <Typography.Text>{it?.title || ''}</Typography.Text>
          </Flex>
        ))}
      </Box>
    </DrawerPaper>
  );
};
