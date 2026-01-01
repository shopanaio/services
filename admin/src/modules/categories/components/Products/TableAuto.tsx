import { ContainerHeight } from '@components/container/ContainerHeight';
import { getCoverColumn, getNameColumn } from '@components/table/columns';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { IProductVariant } from '@src/entity/Product/Variant';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { Empty, Table } from 'antd';

interface IProductsTableAutoProps {
  products: IProductVariant[];
  loading?: boolean;
}

export const ProductsTableAuto = ({
  products,
  loading,
}: IProductsTableAutoProps) => {
  return (
    <ContainerHeight offsetBottom={24}>
      <DrawerPaper
        css={css`
          min-height: var(--container-height);
        `}
      >
        {!!products?.length ? (
          <Table
            sticky={{ offsetHeader: 0 }}
            loading={loading}
            pagination={false}
            style={{ width: '100%' }}
            columns={[getCoverColumn(), getNameColumn()]}
            dataSource={products}
          />
        ) : (
          <Flex align="center" justify="center" py="25">
            <Empty />
          </Flex>
        )}
      </DrawerPaper>
    </ContainerHeight>
  );
};
