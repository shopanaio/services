import { Flex } from '@components/utility/Flex';
import { Pagination, Select, Typography } from 'antd';

export interface ITablePaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onChangePage: (page: number) => void;
  onChangePageSize?: (pageSize: number) => void;
}

export const TablePagination = ({
  page,
  pageSize,
  total,
  onChangePage,
  onChangePageSize,
}: ITablePaginationProps) => {
  return (
    <Flex align="center" justify="space-between" gap="4">
      <Pagination
        onChange={onChangePage}
        style={{ marginRight: 'var(--x4)' }}
        current={page}
        pageSize={pageSize}
        total={total}
        showSizeChanger={false}
        showLessItems
        showPrevNextJumpers
      />
      {onChangePageSize && (
        <Flex align="center" gap="2">
          <Typography.Text type="secondary">Rows per page</Typography.Text>
          <Select
            value={pageSize}
            style={{ width: 80 }}
            onSelect={onChangePageSize}
            options={[25, 50, 100].map((it) => ({
              label: it,
              value: it,
            }))}
          />
        </Flex>
      )}
    </Flex>
  );
};
