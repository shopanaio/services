export const CircleBg = ({ className }: { className?: string }) => {
  return (
    <svg
      className={className}
      width="100%"
      height="100%"
      viewBox="0 0 451 451"
      fill="none"
    >
      <circle
        cx="225.5"
        cy="225.5"
        r="225.5"
        fill="url(#paint0_linear_180993_1812)"
      />
      <defs>
        <linearGradient
          id="paint0_linear_180993_1812"
          x1="225.5"
          y1="0"
          x2="225.5"
          y2="451"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#E5EDFF" />
          <stop offset="1" stopColor="#E6E7FF" />
        </linearGradient>
      </defs>
    </svg>
  );
};
