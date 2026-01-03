"use client";

import { GlobalStyle } from "@/ui-kit/Theme/GlobalStyle";
import { App } from "antd";
import { ThemeProvider } from "antd-style";
import { AntdRegistry } from "@/ui-kit/Theme/AntdRegistry";

export const Theme = ({ children }: { children: React.ReactNode }) => {
  return (
    <AntdRegistry>
      <ThemeProvider
        theme={{
          cssVar: { prefix: "ant" },
          hashed: false,
          zeroRuntime: true,
          token: {
            colorLink: "#2f54eb",
            colorPrimary: "#000",
            fontFamily: "var(--font-family-base)",
          },
          components: {
            Button: {
              primaryShadow: "none",
              defaultShadow: "var(--ds-shadow-border), var(--shadow-small)",
            },
            Table: {
              padding: 8,
              headerBg: "var(--color-gray-1)",
              rowHoverBg: "var(--color-gray-2)",
              rowSelectedBg: "var(--color-primary-3)",
              rowSelectedHoverBg: "var(--color-primary-3)",
            },
            Input: {
              activeShadow: "var(--box-shadow-control)",
            },
            Layout: {
              bodyBg: "transparent",
            },
            Menu: {
              itemColor: "var(--color-primary-8)",
              itemActiveBg: "var(--color-primary-4)",
              itemHoverBg: "var(--color-primary-3)",
              itemSelectedBg: "var(--color-primary-4)",
              itemSelectedColor: "var(--color-primary-10)",
              // @ts-expect-error custom value
              itemBorderRadius: "var(--radius-base)",
            },
            Modal: {
              boxShadow: "var(--box-shadow-modal)",
              colorBgMask: "rgba(241, 241, 241, 0.8)",
            },
            Popover: {
              boxShadowSecondary: "var(--box-shadow-modal)",
            },
            Badge: {
              fontSize: 12,
              colorBgBase: "var(--color-primary-10)",
            },
            Select: {
              activeOutlineColor: "var(--color-primary-5)",
              optionSelectedFontWeight: 400,
              optionActiveBg: "var(--color-primary-3)",
              optionSelectedBg: "var(--color-primary-3)",
              optionSelectedColor: "var(--color-primary-10)",
              boxShadowSecondary: "var(--box-shadow-menu)",
            },
            DatePicker: {
              cellActiveWithRangeBg: "var(--color-primary-4)",
              colorPrimary: "var(--color-primary-10)",
              colorPrimaryBg: "var(--color-primary-3)",
            },
            Dropdown: {
              controlItemBgActive: "var(--color-primary-3)",
              controlItemBgActiveHover: "var(--color-primary-4)",
            },
          },
        }}
      >
        <App>
          <GlobalStyle />
          {children}
        </App>
      </ThemeProvider>
    </AntdRegistry>
  );
};

declare module "antd-style" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface CustomToken {}
}
