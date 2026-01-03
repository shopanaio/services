import { createStyles } from 'antd-style';

export const MiddleArrow = ({
  isFinal,
  color = 'var(--color-gray-6)',
}: {
  isFinal?: boolean;
  color?: string;
}) => {
  return (
    <svg width="10" height="48" viewBox="0 0 10 48" fill="none">
      {!isFinal && <path d="M1 48V20" stroke={color} />}
      <path
        d="M1 0C0.999976 6.25485 1.00012 13.5 1.00016 19C1.00016 23 2.26371 24 4.54422 24C5.54422 24 8.04418 24 9.04443 24M9.04443 24L6.54446 21.5M9.04443 24L6.54446 26.5"
        stroke={color}
      />
    </svg>
  );
};

export const RightArrow = ({
  color = 'var(--color-gray-6)',
  size = 24,
  className,
}: {
  color?: string;
  size?: number;
  className?: string;
}) => {
  return (
    <svg
      className={className}
      width={(90 / 270) * size}
      height={size}
      viewBox="0 0 90 270"
    >
      <path
        d="M0.555736 49.5703C0.555803 35.1191 5.63066 26.2408 12.5714 21.168C19.266 16.2751 27.1386 15.3364 32.2911 15.5234H48.1632C49.8017 6.88746 57.3873 0.357422 66.5001 0.357422C76.8093 0.357422 85.1669 8.71429 85.1671 19.0234C85.1671 29.3328 76.8094 37.6904 66.5001 37.6904C57.387 37.6904 49.8004 31.1599 48.1622 22.5234H32.2012L32.1319 22.5215C27.8764 22.3512 21.7117 23.1581 16.7022 26.8193C11.8866 30.3389 7.5558 36.9217 7.55574 49.5703V216.884L7.54988 216.987C7.25502 221.949 8.21222 229.235 11.8526 235.148C15.351 240.831 21.4536 245.5 32.2716 245.5H55.0001V228.793L90.0001 249L55.0001 269.207V252.5H32.2716C18.9604 252.5 10.6309 246.517 5.89167 238.818C1.32814 231.405 0.225637 222.655 0.555736 216.704V49.5703Z"
        fill={color}
      />
    </svg>
  );
};

const useSubitemIconStyles = createStyles({
  wrapper: {
    marginLeft: -22,
    marginRight: 'var(--x3)',
    marginTop: 'var(--x3)',
  },
});

export const SubitemIcon = ({ isFinal }: { isFinal?: boolean }) => {
  const { styles } = useSubitemIconStyles();

  return (
    <div className={styles.wrapper}>
      <MiddleArrow isFinal={isFinal} />
    </div>
  );
};
