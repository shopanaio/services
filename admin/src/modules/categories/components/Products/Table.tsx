import { ContainerHeight } from '@components/container/ContainerHeight';
import { iconProps } from '@components/styles';
import { DraggableTableUuids } from '@components/table/DraggableTableUuids';
import {
  dragIndicatorColumn,
  getCoverColumn,
  getNameColumn,
} from '@components/table/columns';
import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { IProductVariant } from '@src/entity/Product/Variant';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { App, Button, Empty, Table, Typography } from 'antd';
import { MdClose } from 'react-icons/md';

interface IProductsTableProps {
  loading?: boolean;
  value: IProductVariant[];
  onChange: (value: IProductVariant[]) => void;
  isDraggable?: boolean;
  onDeleteProduct: (product: IProductVariant) => void;
  onReorderProduct: (products: IProductVariant[], id: ID) => void;
}

export const ProductsTable = ({
  value,
  isDraggable,
  loading,
  onDeleteProduct,
  onReorderProduct,
}: IProductsTableProps) => {
  const TableComponent = isDraggable ? DraggableTableUuids : Table;
  const { modal } = App.useApp();

  return (
    <ContainerHeight offsetBottom={24}>
      <DrawerPaper
        css={css`
          min-height: var(--container-height);
        `}
      >
        {!!value?.length ? (
          <TableComponent
            showHeader
            loading={loading}
            sticky={{ offsetHeader: 0 }}
            setDataSource={onReorderProduct}
            pagination={false}
            rowKey="id"
            style={{ width: '100%' }}
            columns={[
              ...(isDraggable ? [dragIndicatorColumn] : []),
              getCoverColumn(),
              getNameColumn({ optionsPath: 'options' }),
              {
                render: (_, entry: IProductVariant) => (
                  <Button
                    type="text"
                    icon={<MdClose   />}
                    onClick={() => {
                      const variantsToRemove = value.filter(
                        (it) => entry.containerId === it.containerId,
                      );

                      modal.confirm({
                        icon: null,
                        width: 600,
                        title: 'Are you sure?',
                        content: (
                          <Box>
                            <Typography.Text>
                              You are about to remove {variantsToRemove.length}{' '}
                              product(s) from the list.
                            </Typography.Text>
                            <Box mt="4">
                              <Table
                                rowKey="id"
                                pagination={false}
                                showHeader={false}
                                dataSource={variantsToRemove}
                                columns={[
                                  getCoverColumn(),
                                  getNameColumn({
                                    optionsPath: 'options',
                                  }),
                                ]}
                              />
                            </Box>
                          </Box>
                        ),
                        onOk: () => {
                          onDeleteProduct(entry);
                        },
                      });
                    }}
                  />
                ),
                dataIndex: 'close',
                key: 'close',
                width: 48,
              },
            ]}
            dataSource={value}
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
