import { useMemo } from "react";
import { Flex, Button, Select, Typography, Tooltip } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export interface CursorPaginationProps {
  name?: string;
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
  /** Disable all pagination controls */
  disabled?: boolean;
  /** Tooltip to show when pagination is disabled */
  disabledReason?: string;
}

export function CursorPagination({
  name,
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
  disabled = false,
  disabledReason = "Save or discard changes to navigate",
}: CursorPaginationProps) {
  const selectOptions = useMemo(
    () => pageSizeOptions.map((size) => ({ value: size, label: String(size) })),
    [pageSizeOptions]
  );

  const prevButton = (
    <Button
      data-testid={name ? `${name}-pagination-prev-button` : undefined}
      size="small"
      icon={<LeftOutlined />}
      disabled={!hasPrev || disabled}
      onClick={onPrev}
    />
  );

  const nextButton = (
    <Button
      data-testid={name ? `${name}-pagination-next-button` : undefined}
      size="small"
      icon={<RightOutlined />}
      disabled={!hasNext || disabled}
      onClick={onNext}
    />
  );

  const navButtons = disabled ? (
    <Tooltip title={disabledReason}>
      <Flex gap="small">
        {prevButton}
        {nextButton}
      </Flex>
    </Tooltip>
  ) : (
    <Flex gap="small">
      {prevButton}
      {nextButton}
    </Flex>
  );

  return (
    <Flex justify="space-between" align="center" style={{ padding: "12px 0" }}>
      <Flex align="center" gap="small">
        <Typography.Text type="secondary">Rows per page:</Typography.Text>
        {disabled ? (
          <Tooltip title={disabledReason}>
            <Select
              data-testid={name ? `${name}-pagination-page-size-select` : undefined}
              value={pageSize}
              onChange={onPageSizeChange}
              options={selectOptions}
              size="small"
              style={{ width: 70 }}
              disabled
            />
          </Tooltip>
        ) : (
          <Select
            data-testid={name ? `${name}-pagination-page-size-select` : undefined}
            value={pageSize}
            onChange={onPageSizeChange}
            options={selectOptions}
            size="small"
            style={{ width: 70 }}
          />
        )}
      </Flex>

      <Flex align="center" gap="middle">
        <Typography.Text
          type="secondary"
          data-testid={name ? `${name}-pagination-range` : undefined}
        >
          {rangeStart}–{rangeEnd} of {total}
        </Typography.Text>
        {navButtons}
      </Flex>
    </Flex>
  );
}
