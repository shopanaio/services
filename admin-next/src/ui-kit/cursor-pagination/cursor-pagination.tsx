import { useMemo } from "react";
import { Flex, Button, Select, Typography } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export interface CursorPaginationProps {
  total: number;
  rangeStart: number;
  rangeEnd: number;
  pageSize: number;
  pageSizeOptions?: number[];
  hasNext: boolean;
  hasPrev: boolean;
  onNext: () => void;
  onPrev: () => void;
  onPageSizeChange: (size: number) => void;
}

export function CursorPagination({
  total,
  rangeStart,
  rangeEnd,
  pageSize,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  hasNext,
  hasPrev,
  onNext,
  onPrev,
  onPageSizeChange,
}: CursorPaginationProps) {
  const selectOptions = useMemo(
    () => pageSizeOptions.map((size) => ({ value: size, label: String(size) })),
    [pageSizeOptions]
  );

  return (
    <Flex justify="space-between" align="center" style={{ padding: "12px 0" }}>
      <Flex align="center" gap="small">
        <Typography.Text type="secondary">Rows per page:</Typography.Text>
        <Select
          value={pageSize}
          onChange={onPageSizeChange}
          options={selectOptions}
          size="small"
          style={{ width: 70 }}
        />
      </Flex>

      <Flex align="center" gap="middle">
        <Typography.Text type="secondary">
          {rangeStart}–{rangeEnd} of {total}
        </Typography.Text>
        <Flex gap="small">
          <Button
            size="small"
            icon={<LeftOutlined />}
            disabled={!hasPrev}
            onClick={onPrev}
          />
          <Button
            size="small"
            icon={<RightOutlined />}
            disabled={!hasNext}
            onClick={onNext}
          />
        </Flex>
      </Flex>
    </Flex>
  );
}
