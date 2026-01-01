import { ArrowRightOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import styled from '@emotion/styled';
import { useIntl } from 'react-intl';
import { css } from '@emotion/react';

export const Trigger = styled(Button)`
  background: var(--gray-3);
  box-shadow: 0 2px 0 0 rgba(0, 0, 0, 0.04);
  position: absolute;
  bottom: 20px;
  right: -16px;
`;

interface Props {
  isCollapsed?: boolean;
}

export const ToggleButton = ({ isCollapsed }: Props) => {
  const { formatMessage } = useIntl();

  const icon = isCollapsed ? (
    <ArrowRightOutlined size={10} />
  ) : (
    <ArrowLeftOutlined size={10} />
  );

  return (
    <Button
      css={css`
        box-shadow: 0 2px 0 0 rgba(0, 0, 0, 0.04);
        position: absolute;
        bottom: 20px;
        right: -16px;
      `}
      size="middle"
      // shape="circle"
      icon={icon}
      aria-label={formatMessage({ id: 'aria-label.sidebar.toggle_button' })}
      data-testid={
        isCollapsed ? 'expand-sidebar-button' : 'collapse-sidebar-button'
      }
    />
  );
};
