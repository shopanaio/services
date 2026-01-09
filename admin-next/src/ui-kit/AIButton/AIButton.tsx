import { createStyles } from "antd-style";
import { ThunderboltOutlined } from "@ant-design/icons";

const useStyles = createStyles(() => ({
  aiButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 12px",
    fontSize: 13,
    fontWeight: 500,
    borderRadius: 6,
    cursor: "pointer",
    background:
      "linear-gradient(#fff, #fff) padding-box, linear-gradient(135deg, #8b5cf6 0%, #d946ef 50%, #e879f9 100%) border-box",
    border: "1px solid transparent",
    transition: "all 0.3s ease",
    "& span": {
      background:
        "linear-gradient(135deg, #8b5cf6 0%, #d946ef 50%, #e879f9 100%)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
    },
    "& svg": {
      color: "#a855f7",
    },
    "&:hover": {
      background:
        "linear-gradient(135deg, #8b5cf6 0%, #d946ef 50%, #e879f9 100%) padding-box, linear-gradient(135deg, #8b5cf6 0%, #d946ef 50%, #e879f9 100%) border-box",
      "& span": {
        background: "#fff",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
      },
      "& svg": {
        color: "#fff",
      },
    },
  },
}));

interface IAIButtonProps {
  onClick: () => void;
  children?: React.ReactNode;
}

export const AIButton = ({ onClick, children = "Write with AI" }: IAIButtonProps) => {
  const { styles } = useStyles();

  return (
    <button type="button" className={styles.aiButton} onClick={onClick}>
      <ThunderboltOutlined />
      <span>{children}</span>
    </button>
  );
};
