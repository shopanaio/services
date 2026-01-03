import { createStyles } from 'antd-style';
import { Flex, Pagination, Select, Typography } from 'antd';

const useStyles = createStyles({
  pagination: {
    marginRight: 'var(--x4)',
  },
  select: {
    width: 80,
  },
});

export interface ITablePaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onChangePage: (page: number) => void;
  onChangePageSize?: (pageSize: number) => void;
  rowsPerPageLabel?: string;
}

export const TablePagination = ({
  page,
  pageSize,
  total,
  onChangePage,
  onChangePageSize,
  rowsPerPageLabel = 'Rows per page',
}: ITablePaginationProps) => {
  const { styles } = useStyles();

  return (
    <Flex align="center" justify="space-between" gap="middle">
      <Pagination
        onChange={onChangePage}
        className={styles.pagination}
        current={page}
        pageSize={pageSize}
        total={total}
        showSizeChanger={false}
        showLessItems
        showPrevNextJumpers
      />
      {onChangePageSize && (
        <Flex align="center" gap="small">
          <Typography.Text type="secondary">{rowsPerPageLabel}</Typography.Text>
          <Select
            value={pageSize}
            className={styles.select}
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
