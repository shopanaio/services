import { css } from '@emotion/react';
import { Tag } from 'antd';
import { ReactNode } from 'react';

interface IStatusSummaryProps {
  value: string[];
  statuses: Record<
    string,
    { color: string; index: number; value: string; label: ReactNode }
  >;
  fallback?: ReactNode;
}

export const StatusSummary = ({
  statuses,
  value,
  fallback = null,
}: IStatusSummaryProps) => {
  const groups = value.reduce(
    (acc, it) => {
      acc[it] = (acc[it] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const maxPriorityStatus = Object.keys(groups)
    .map((it) => statuses[it])
    .filter(Boolean)
    .sort((a, b) => b.index - a.index)
    .at(0);

  if (!maxPriorityStatus) {
    return (
      <Tag
        css={css`
          margin: 0;
          color: var(--color-gray-6);
        `}
      >
        {fallback}
      </Tag>
    );
  }

  const { color, label, value: status } = maxPriorityStatus;

  const count = groups[status];
  const qnt = value.length;

  const isSplit = qnt > 1;

  return (
    <Tag
      // bordered={false}
      color={color}
      css={css`
        margin: 0;
      `}
    >
      {label}
      {isSplit ? ` ${count}/${qnt}` : ''}
    </Tag>
  );
};
