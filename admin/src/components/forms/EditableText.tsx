import { iconProps } from '@components/styles';
import { Typography } from 'antd';
import { MdEdit } from 'react-icons/md';

export interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  status?: 'error';
}

export const EditableText = ({
  value,
  onChange,
  status,
}: EditableTextProps) => {
  return (
    <Typography.Text
      strong={!!value}
      style={{ width: 300 }}
      editable={{
        triggerType: ['icon', 'text'],
        onChange,
        text: value,
        icon: (
          <MdEdit
            color={
              status === 'error' ? 'var(--color-red-6)' : 'var(--color-gray-6)'
            }

          />
        ),
      }}
    >
      {value || (
        <span
          style={{
            color:
              status === 'error' ? 'var(--color-red-6)' : 'var(--color-gray-6)',
          }}
        >
          Edit title
        </span>
      )}
    </Typography.Text>
  );
};
