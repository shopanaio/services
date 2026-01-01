import { css } from '@emotion/react';
import { MdCheck, MdContentCopy } from 'react-icons/md';

export const getCopyableProps = (text: string) => {
  return {
    tooltips: false,
    text,
    icon: [
      <MdContentCopy
        size={16}
        color="var(--color-gray-8)"
        className="ant-typography-copy-icon"
      />,
      <MdCheck size={16} color="var(--color-gray-6)" />,
    ],
  };
};

export const getCopyableCss = () => {
  return css`
    & .ant-typography-copy-icon {
      opacity: 0;
    }

    &:hover {
      .ant-typography-copy-icon {
        opacity: 1;
      }
    }
  `;
};
