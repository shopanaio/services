"use client";

import { Typography, Button } from "antd";
import { MailOutlined } from "@ant-design/icons";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { mockInvitations, getRoleByName } from "../../../../mocks/data";
import type { IInvitation } from "../../../../mocks/data";
import { useStyles } from "../../organization-page.styles";
import { getDaysUntilExpiry } from "../../utils";
import type { InvitationsSectionProps } from "../../types";

export function InvitationsSection({ onResend, onCancel }: InvitationsSectionProps) {
  const { styles } = useStyles();

  if (mockInvitations.length === 0) {
    return null;
  }

  return (
    <Paper>
      <PaperHeader title="Pending Invitations" />
      {mockInvitations.map((invitation: IInvitation) => {
        const role = getRoleByName(invitation.role);
        return (
          <div key={invitation.id} className={styles.invitationItem}>
            <div className={styles.invitationInfo}>
              <MailOutlined className={styles.invitationIcon} />
              <div className={styles.invitationDetails}>
                <Typography.Text className={styles.invitationEmail}>
                  {invitation.email}
                </Typography.Text>
                <Typography.Text className={styles.invitationMeta}>
                  Invited as: {role?.displayName || invitation.role} ·
                  Expires in {getDaysUntilExpiry(invitation.expiresAt)} days
                </Typography.Text>
              </div>
            </div>
            <div className={styles.invitationActions}>
              <Button
                size="small"
                onClick={() => onResend(invitation.id)}
              >
                Resend
              </Button>
              <Button
                size="small"
                danger
                onClick={() => onCancel(invitation.id)}
              >
                Cancel
              </Button>
            </div>
          </div>
        );
      })}
    </Paper>
  );
}
