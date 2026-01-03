import { createStyles } from 'antd-style';
import { MdSave } from 'react-icons/md';
import { Button, ButtonProps, Flex, Select, Typography } from 'antd';
import { ReactNode } from 'react';

const useStyles = createStyles({
  select: {
    minWidth: 240,
  },
  button: {
    width: 100,
  },
});

export interface IPageHeaderProps {
  children?: ReactNode;
  title: string;
  onClose?: () => void;
  statusSelectProps?: ReactNode;
  submitButtonProps?: ButtonProps | null;
  status?: boolean;
  extra?: ReactNode;
  switchLocale?: boolean;
  name?: string;
  statusOptions?: Array<{ value: string; label: string }>;
  statusValue?: string;
  onStatusChange?: (value: string) => void;
  saveLabel?: string;
}

export const PageHeader = ({
  name,
  title,
  submitButtonProps,
  status = false,
  extra = null,
  statusOptions = [],
  statusValue,
  onStatusChange,
  saveLabel = 'Save',
}: IPageHeaderProps) => {
  const { styles } = useStyles();

  return (
    <Flex
      justify="space-between"
      style={{ padding: 'var(--x4) var(--x6)', minHeight: 64 }}
    >
      <Typography.Title level={4}>{title}</Typography.Title>
      <Flex gap="middle" align="center">
        {extra}
        {status && (
          <Select
            value={statusValue}
            onChange={onStatusChange}
            className={styles.select}
            placeholder="Select status"
            data-testid="status-select"
            options={statusOptions}
          />
        )}
        {submitButtonProps !== null && (
          <Button
            data-testid={`submit-${name}=form-button`}
            icon={<MdSave />}
            type="primary"
            className={styles.button}
            {...submitButtonProps}
          >
            {saveLabel}
          </Button>
        )}
      </Flex>
    </Flex>
  );
};
