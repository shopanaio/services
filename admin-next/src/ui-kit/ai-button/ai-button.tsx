import { createStyles } from "antd-style";
import { ThunderboltOutlined } from "@ant-design/icons";

const AI_GRADIENT = "linear-gradient(135deg, #8b5cf6 0%, #d946ef 50%, #e879f9 100%)";
const AI_GRADIENT_HOVER = "linear-gradient(135deg, #7c3aed 0%, #c026d3 50%, #d946ef 100%)";
const AI_ICON_COLOR = "#a855f7";

const useStyles = createStyles(({ token }) => ({
  aiButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 12px",
    fontSize: 13,
    fontWeight: 500,
    borderRadius: 6,
    cursor: "pointer",
    background: `linear-gradient(${token.colorBgContainer}, ${token.colorBgContainer}) padding-box, ${AI_GRADIENT} border-box`,
    border: "1px solid transparent",
    transition: "all 0.3s ease",
    "& span": {
      background: AI_GRADIENT,
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
    },
    "& svg": {
      color: AI_ICON_COLOR,
    },
    "&:hover": {
      background: `${AI_GRADIENT_HOVER} padding-box, ${AI_GRADIENT_HOVER} border-box`,
      "& span": {
        background: token.colorTextLightSolid,
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
      },
      "& svg": {
        color: token.colorTextLightSolid,
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
