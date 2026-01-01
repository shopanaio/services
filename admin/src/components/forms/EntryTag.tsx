import { Box } from '@components/utility/Box';
import { cropStringInTheMiddle } from '@src/utils/utils';
import { Tag } from 'antd';
import { ReactNode } from 'react';

export const EntryTag = ({
  className,
  entry,
  onClose,
  icon,
}: {
  icon?: ReactNode;
  className?: string;
  entry?: {
    title?: string;
    slug?: string;
    color?: string;
  } | null;
  onClose: () => void;
}) => {
  const title = entry?.title || entry?.slug || '';
  if (!title) {
    return null;
  }

  return (
    <Box mt="2">
      <Tag
        icon={icon}
        className={className}
        closable
        onClose={onClose}
        data-testid="tag-item"
        color={entry?.color || 'blue'}
      >
        {cropStringInTheMiddle(title, 30)}
      </Tag>
    </Box>
  );
};
