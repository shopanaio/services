import { Flex, Button, Select, Typography } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";

const PAGE_SIZE_OPTIONS = [
  { value: 10, label: "10" },
  { value: 20, label: "20" },
  { value: 50, label: "50" },
];

export interface CursorPaginationProps {
  total: number;
  rangeStart: number;
  rangeEnd: number;
  pageSize: number;
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
  hasNext,
  hasPrev,
  onNext,
  onPrev,
  onPageSizeChange,
}: CursorPaginationProps) {
  return (
    <Flex justify="space-between" align="center" style={{ padding: "12px 0" }}>
      <Flex align="center" gap="small">
        <Typography.Text type="secondary">Rows per page:</Typography.Text>
        <Select
          value={pageSize}
          onChange={onPageSizeChange}
          options={PAGE_SIZE_OPTIONS}
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
