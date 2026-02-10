import { Button, Flex, Input, Tooltip } from "antd";
import { CopyOutlined, CheckOutlined } from "@ant-design/icons";
import {
  FaTelegramPlane,
  FaWhatsapp,
  FaFacebookF,
  FaLinkedinIn,
  FaViber,
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { HiOutlineMail } from "react-icons/hi";
import { useSharePopoverStyles } from "../product-info-header.styles";
import type { ISharePopoverProps, ISocialLink } from "../types";

const socialLinks: ISocialLink[] = [
  {
    key: "Telegram",
    icon: <FaTelegramPlane />,
    color: "#26A5E4",
    getUrl: (url) => `https://t.me/share/url?url=${encodeURIComponent(url)}`,
  },
  {
    key: "WhatsApp",
    icon: <FaWhatsapp />,
    color: "#25D366",
    getUrl: (url) => `https://wa.me/?text=${encodeURIComponent(url)}`,
  },
  {
    key: "X",
    icon: <FaXTwitter />,
    color: "#000000",
    getUrl: (url) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`,
  },
  {
    key: "Facebook",
    icon: <FaFacebookF />,
    color: "#1877F2",
    getUrl: (url) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    key: "LinkedIn",
    icon: <FaLinkedinIn />,
    color: "#0A66C2",
    getUrl: (url) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
        url
      )}`,
  },
  {
    key: "Viber",
    icon: <FaViber />,
    color: "#7360F2",
    getUrl: (url) => `viber://forward?text=${encodeURIComponent(url)}`,
  },
  {
    key: "Email",
    icon: <HiOutlineMail />,
    color: "#EA4335",
    getUrl: (url) => `mailto:?body=${encodeURIComponent(url)}`,
  },
];

export const SharePopoverContent = ({
  url,
  copied,
  onCopy,
}: ISharePopoverProps) => {
  const { styles } = useSharePopoverStyles();

  return (
    <Flex vertical gap={12} className={styles.sharePopover}>
      <Flex wrap="wrap" justify="space-between" gap={8}>
        {socialLinks.map((social) => (
          <Tooltip key={social.key} title={social.key}>
            <Button
              type="text"
              shape="circle"
              size="large"
              href={social.getUrl(url)}
              target="_blank"
              icon={social.icon}
              style={{ color: social.color, fontSize: 20 }}
            />
          </Tooltip>
        ))}
      </Flex>
      <Input.Search
        value={url}
        readOnly
        size="small"
        className={styles.shareInput}
        enterButton={
          <Button
            size="small"
            icon={copied ? <CheckOutlined /> : <CopyOutlined />}
          >
            {copied ? "Copied" : "Copy"}
          </Button>
        }
        onSearch={onCopy}
      />
    </Flex>
  );
};
