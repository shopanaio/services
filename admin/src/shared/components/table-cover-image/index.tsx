"use client";

import type { CSSProperties, ReactNode } from "react";
import { Avatar, Image } from "antd";

export interface TableCoverImageProps {
  src?: string | null;
  alt: string;
  fallbackIcon: ReactNode;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

const baseStyle: CSSProperties = {
  borderRadius: 4,
  flexShrink: 0,
};

export function TableCoverImage({
  src,
  alt,
  fallbackIcon,
  size = 40,
  className,
  style,
}: TableCoverImageProps) {
  const mergedStyle = {
    ...baseStyle,
    ...style,
  };

  if (src) {
    return (
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        className={className}
        style={{ ...mergedStyle, objectFit: "cover" }}
        preview={false}
      />
    );
  }

  return (
    <Avatar
      size={size}
      icon={fallbackIcon}
      shape="square"
      className={className}
      style={mergedStyle}
    />
  );
}
