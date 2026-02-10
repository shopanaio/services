import { Avatar, Flex, Typography } from "antd";
import { useUserPopoverStyles } from "../product-info-header.styles";
import type { IUserPopoverProps } from "../types";

export const UserPopoverContent = ({
  firstName,
  lastName,
  email,
}: IUserPopoverProps) => {
  const { styles } = useUserPopoverStyles();

  return (
    <Flex align="center" gap={12} className={styles.userPopover}>
      <Avatar size={40} className={styles.userAvatar}>
        {firstName.charAt(0)}
        {lastName.charAt(0)}
      </Avatar>
      <div>
        <Typography.Text strong className={styles.userName}>
          {firstName} {lastName}
        </Typography.Text>
        <Typography.Text type="secondary" className={styles.userEmail}>
          {email}
        </Typography.Text>
      </div>
    </Flex>
  );
};
