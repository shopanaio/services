"use client";

import { useState } from "react";
import { Typography, Button, Upload, message, ColorPicker, Flex } from "antd";
import { createStyles } from "antd-style";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { SettingsSection } from "../../shared";
import { mockOrganization } from "../../mocks/data";

const useStyles = createStyles(({ token }) => ({
  container: {
    maxWidth: 800,
    margin: "0 auto",
    padding: token.paddingLG,
    display: "flex",
    flexDirection: "column",
    gap: token.marginLG,
  },
  uploadArea: {
    display: "flex",
    alignItems: "center",
    gap: token.marginLG,
  },
  uploadBox: {
    width: 128,
    height: 128,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    border: `2px dashed ${token.colorBorder}`,
    borderRadius: token.borderRadiusLG,
    backgroundColor: token.colorBgLayout,
    cursor: "pointer",
    transition: "all 0.2s",
    "&:hover": {
      borderColor: token.colorPrimary,
      backgroundColor: token.colorPrimaryBg,
    },
  },
  uploadText: {
    marginTop: token.marginXS,
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
  uploadHint: {
    flex: 1,
  },
  hintTitle: {
    fontWeight: 500,
    marginBottom: token.marginXS,
    display: "block",
  },
  hintText: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
    display: "block",
    marginBottom: token.marginXS,
  },
  colorRow: {
    display: "flex",
    alignItems: "center",
    gap: token.marginMD,
    marginBottom: token.marginMD,
  },
  colorLabel: {
    minWidth: 120,
    fontWeight: 500,
  },
  comingSoon: {
    color: token.colorTextTertiary,
    fontSize: token.fontSizeSM,
    fontStyle: "italic",
  },
}));

export default function BrandingPage() {
  const { styles } = useStyles();
  const [logo, setLogo] = useState<string | null>(mockOrganization.logo || null);
  const [primaryColor, setPrimaryColor] = useState("#1890ff");
  const [accentColor, setAccentColor] = useState("#52c41a");

  const handleUpload = (file: File) => {
    // Mock upload - in real app would upload to server
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogo(e.target?.result as string);
      message.success("Logo uploaded successfully");
    };
    reader.readAsDataURL(file);
    return false; // Prevent default upload
  };

  const handleRemoveLogo = () => {
    setLogo(null);
    message.success("Logo removed");
  };

  return (
    <div className={styles.container}>
      <SettingsSection title="Logo">
        <div className={styles.uploadArea}>
          <Upload
            showUploadList={false}
            beforeUpload={handleUpload}
            accept="image/png,image/jpeg,image/svg+xml"
          >
            <div className={styles.uploadBox}>
              {logo ? (
                <img
                  src={logo}
                  alt="Organization logo"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    borderRadius: 8,
                  }}
                />
              ) : (
                <>
                  <PlusOutlined style={{ fontSize: 24 }} />
                  <span className={styles.uploadText}>Upload</span>
                </>
              )}
            </div>
          </Upload>
          <div className={styles.uploadHint}>
            <Typography.Text className={styles.hintTitle}>
              Upload your organization logo
            </Typography.Text>
            <Typography.Text className={styles.hintText}>
              Recommended: 256x256px, PNG or SVG
            </Typography.Text>
            <Typography.Text className={styles.hintText}>
              Maximum file size: 5MB
            </Typography.Text>
            {logo && (
              <Button
                icon={<DeleteOutlined />}
                danger
                size="small"
                onClick={handleRemoveLogo}
                style={{ marginTop: 8 }}
              >
                Remove Logo
              </Button>
            )}
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Brand Colors"
        description="Customize your organization's color scheme"
      >
        <div className={styles.colorRow}>
          <Typography.Text className={styles.colorLabel}>
            Primary Color
          </Typography.Text>
          <ColorPicker
            value={primaryColor}
            onChange={(color) => setPrimaryColor(color.toHexString())}
            showText
          />
          <Typography.Text className={styles.comingSoon}>
            (Coming soon)
          </Typography.Text>
        </div>
        <div className={styles.colorRow}>
          <Typography.Text className={styles.colorLabel}>
            Accent Color
          </Typography.Text>
          <ColorPicker
            value={accentColor}
            onChange={(color) => setAccentColor(color.toHexString())}
            showText
          />
          <Typography.Text className={styles.comingSoon}>
            (Coming soon)
          </Typography.Text>
        </div>
      </SettingsSection>
    </div>
  );
}
