import { usePageHeight } from '@components/container/usePageHeight';
import { css } from '@emotion/react';
import { useRef } from 'react';

const styles = css`
  min-height: var(--container-height, 100vh);
  flex-grow: 1;
`;

export interface IContainerProps {
  children: React.ReactNode;
  offsetBottom?: number;
  style?: React.CSSProperties;
  className?: string;
}

export const ContainerHeight = ({
  offsetBottom = 24,
  style,
  ...props
}: IContainerProps) => {
  const ref = useRef<HTMLDivElement | null>(null);

  const { height } = usePageHeight({
    bottom: offsetBottom,
    ref,
  });

  return (
    <div
      {...props}
      ref={ref}
      css={styles}
      style={
        {
          ...style,
          ['--container-height']: height ? `${height}px` : '100vh',
        } as React.CSSProperties
      }
    />
  );
};
