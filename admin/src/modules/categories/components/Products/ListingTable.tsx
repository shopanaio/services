import { NotFoundTableElement } from '@components/emptyState/EmptyTableState';
import { Paper } from '@components/paper/Paper';
import { DraggableTable } from '@components/table/DraggableTable';
import { getCoverColumn, getNameColumn } from '@components/table/columns';
import { Box } from '@components/utility/Box';
import { css } from '@emotion/react';
import { IProductVariant } from '@src/entity/Product/Variant';
import { $drawers } from '@src/layouts/drawers/store/drawers';
import { DrawerTypes } from '@src/layouts/drawers/types';
import { App, Button, Table, Typography } from 'antd';
import { FormattedMessage } from 'react-intl';
import { t } from '@src/lang/messages';
import { MdClose, MdDragIndicator } from 'react-icons/md';
import emptyStateLottie from './market-analysis.json';

interface IListingTableProps {
  loading?: boolean;
  value: IProductVariant[];
  onDeleteEntry: (entry: IProductVariant) => void;
  onReorderEntry: (entries: IProductVariant[], id: ID) => void;
  isDraggable: boolean;
}

export const ListingTable = ({
  value,
  loading,
  onDeleteEntry,
  onReorderEntry,
  isDraggable,
}: IListingTableProps) => {
  const { modal } = App.useApp();

  const TableComponent = isDraggable ? DraggableTable : Table;

  const emptyText = (
    <NotFoundTableElement
      lottie={emptyStateLottie}
      loading={loading}
      title={<FormattedMessage id={t('category.listingTable.empty.title')} />}
      height="300px"
      subtitle={
        <FormattedMessage
          id={t('category.listingTable.empty.subtitle.manual')}
        />
      }
    />
  );

  return (
    <Paper
      css={
        value?.length === 0
          ? css`
              box-shadow: none;
            `
          : undefined
      }
    >
      <TableComponent
        tableLayout="fixed"
        showHeader={false}
        loading={loading}
        rowKey="id"
        locale={{ emptyText }}
        setDataSource={onReorderEntry}
        pagination={false}
        style={{ width: '100%' }}
        onRow={(_, idx) => ({
          'data-testid': `product-${idx}`,
        })}
        columns={[
          ...(isDraggable
            ? [
                {
                  key: 'drag',
                  width: 40,
                  render: (_: any) => (
                    <Button
                      type="text"
                      data-testid="drag-handle"
                      css={css`
                        cursor: move;
                      `}
                      icon={<MdDragIndicator />}
                    />
                  ),
                },
              ]
            : []),
          getNameColumn({
            coverPath: 'cover',
            onClick: (entry: IProductVariant) => {
              $drawers.addDrawer({
                type: DrawerTypes.PRODUCT,
                entityId: entry.containerId,
              });
            },
          }),
          {
            render: (_, entry: IProductVariant & { deletable?: boolean }) => {
              if (!entry.deletable) {
                return null;
              }

              return (
                <Button
                  type="text"
                  icon={<MdClose />}
                  data-testid="remove-listing-item-button"
                  onClick={() => {
                    const variantsToRemove = value.filter(
                      (it) => entry.containerId === it.containerId,
                    );

                    modal.confirm({
                      icon: null,
                      width: 600,
                      title: (
                        <FormattedMessage
                          id={t('category.listingTable.remove.confirmTitle')}
                        />
                      ),
                      content: (
                        <Box>
                          <Typography.Text>
                            <FormattedMessage
                              id={t(
                                'category.listingTable.remove.confirmContent',
                              )}
                            />
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
                      okButtonProps: {
                        'data-testid': 'confirm-remove-listing-items',
                      },
                      cancelButtonProps: {
                        'data-testid': 'cancel-remove-listing-items',
                      },
                      onOk: () => {
                        onDeleteEntry(entry);
                      },
                    });
                  }}
                />
              );
            },
            dataIndex: 'close',
            key: 'close',
            width: 48,
          },
        ]}
        dataSource={value}
      />
    </Paper>
  );
};
