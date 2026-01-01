import { css, keyframes } from '@emotion/react';

const processingIndicator = keyframes`
  from {
    background-position: 100% 0;
  }
  to {
    background-position: -100% 0;
  }
`;

const s = {
  indicator: css`
    position: fixed;
    top: 0;
    left: 0;
    animation-duration: 3s;
    animation-fill-mode: forwards;
    animation-iteration-count: infinite;
    animation-name: ${processingIndicator};
    animation-timing-function: linear;
    background: transparent;
    background: linear-gradient(
      to right,
      transparent 25%,
      var(--color-primary) 50%,
      transparent 75%
    );
    background-size: 200% 100%;
    height: 5px;
    width: 110vw;
    z-index: 1000;
  `,
};

interface IProcessingProps {
  active: boolean;
}

export const ProcessingIndicator = ({ active }: IProcessingProps) => {
  if (!active) {
    return null;
  }

  return <div css={s.indicator} />;
};
