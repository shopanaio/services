import { Popconfirm } from 'antd';

interface IConfirmSavingProps {
  onOk: (result: boolean) => void;
  disabled?: boolean;
  children?: React.ReactNode;
  title: string;
}

export const Confirm = ({
  onOk,
  disabled,
  children,
  title,
}: IConfirmSavingProps) => {
  return (
    <Popconfirm
      icon={null}
      okType="primary"
      title={title}
      onConfirm={() => onOk(true)}
      onCancel={() => onOk(false)}
      cancelText="No"
      okText="Yes"
      disabled={disabled}
      destroyTooltipOnHide
      cancelButtonProps={{
        'data-testid': `confirm-no`,
      }}
      okButtonProps={{
        'data-testid': `confirm-yes`,
      }}
    >
      {children}
    </Popconfirm>
  );
};
