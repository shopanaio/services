import { Popconfirm } from 'antd';

interface IConfirmSavingProps {
  onOk: (result: boolean) => void;
  disabled?: boolean;
  children?: React.ReactNode;
  message?: string;
}

export const ConfirmSaving = ({
  onOk,
  disabled,
  children,
  message = 'Do you want to save changes?',
}: IConfirmSavingProps) => {
  return (
    <Popconfirm
      icon={null}
      okType="primary"
      title={message}
      onConfirm={() => onOk(true)}
      onCancel={() => onOk(false)}
      cancelText="No"
      okText="Yes"
      disabled={disabled}
      destroyTooltipOnHide
      cancelButtonProps={{
        'data-testid': `nav-confirm-no`,
      }}
      okButtonProps={{
        'data-testid': `nav-confirm-yes`,
      }}
    >
      {children}
    </Popconfirm>
  );
};
