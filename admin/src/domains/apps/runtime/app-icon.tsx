import { createStyles } from "antd-style";

const useStyles = createStyles(({ token }) => ({
  icon: {
    borderRadius: token.borderRadiusSM,
    display: "block",
    flex: "none",
    objectFit: "contain",
  },
}));

export interface AdminAppIconMetadata {
  readonly url: string;
  readonly alt: string;
}

export function AdminAppIcon({
  icon,
  size,
  decorative = false,
}: {
  icon: AdminAppIconMetadata;
  size: number;
  decorative?: boolean;
}) {
  const { styles } = useStyles();

  return (
    <img
      alt={decorative ? "" : icon.alt}
      aria-hidden={decorative || undefined}
      className={styles.icon}
      height={size}
      src={icon.url}
      width={size}
    />
  );
}
