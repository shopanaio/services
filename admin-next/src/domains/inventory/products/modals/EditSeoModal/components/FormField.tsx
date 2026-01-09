import { ReactNode } from "react";
import { Typography } from "antd";
import { useStyles } from "../EditSeoModal.styles";

interface IFormFieldProps {
  label: string;
  children: ReactNode;
  isLast?: boolean;
}

export const FormField = ({ label, children, isLast }: IFormFieldProps) => {
  const { styles } = useStyles();

  return (
    <div className={isLast ? styles.formItemLast : styles.formItem}>
      <Typography.Text strong className={styles.label}>
        {label}
      </Typography.Text>
      {children}
    </div>
  );
};
