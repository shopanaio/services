import type { ReactNode } from "react";
import { Typography } from "antd";
import { useEntityEditFormStyles } from "./entity-edit-forms.styles";

interface FormFieldProps {
  label: string;
  children: ReactNode;
  isLast?: boolean;
}

export const FormField = ({ label, children, isLast }: FormFieldProps) => {
  const { styles } = useEntityEditFormStyles();

  return (
    <div className={isLast ? styles.formItemLast : styles.formItem}>
      <Typography.Text strong className={styles.label}>
        {label}
      </Typography.Text>
      {children}
    </div>
  );
};
