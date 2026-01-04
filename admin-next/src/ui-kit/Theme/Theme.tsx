"use client";

import { GlobalStyle } from "@/ui-kit/Theme/GlobalStyle";
import { App } from "antd";
import { ThemeProvider } from "antd-style";
import { AntdRegistry } from "@/ui-kit/Theme/AntdRegistry";
import { ModalStack } from "@/layouts/modals";

const customToken = {
  // Background gradients
  bgGradient:
    "linear-gradient(90deg, hsl(255, 70%, 100%) 0%, hsl(217, 70%, 100%) 50%, hsl(210, 70%, 100%) 100%)",
  bgGradientAccent:
    "linear-gradient(90deg, hsl(255, 80%, 98%) 0%, hsl(217, 80%, 98%) 50%, hsl(210, 80%, 98%) 100%)",

  // Custom shadows
  shadowBorder: "0 0 0 1px rgba(0, 0, 0, 0.08)",
  shadowSmall: "0px 2px 2px rgba(0, 0, 0, 0.04)",
  boxShadowModal:
    "0 0 0 1px rgba(0, 0, 0, 0.08), 0px 1px 1px rgba(0, 0, 0, 0.02), 0px 8px 16px -4px rgba(0, 0, 0, 0.04), 0px 24px 32px -8px rgba(0, 0, 0, 0.06)",
  boxShadowMenu:
    "0 0 0 1px rgba(0, 0, 0, 0.08), 0px 1px 1px rgba(0, 0, 0, 0.02), 0px 4px 8px -4px rgba(0, 0, 0, 0.04), 0px 16px 24px -8px rgba(0, 0, 0, 0.06)",
  boxShadowPaper: "0 0 0 1px rgba(0, 0, 0, 0.08), 0px 1px 3px 0 rgba(0, 0, 0, 0.05)",
  boxShadowControl: "0 0 1px 4px var(--ant-color-fill)",

  // Layout
  stickyHeaderHeight: 64,
  tableLayoutMinHeight: 100,
  containerHeight: 600,
};

export const Theme = ({ children }: { children: React.ReactNode }) => {
  return (
    <AntdRegistry>
      <ThemeProvider
        customToken={customToken}
        theme={{
          cssVar: { prefix: "ant" },
          hashed: false,
          token: {
            colorLink: "#2f54eb",
            colorPrimary: "#000",
            fontFamily: 'var(--font-safiro), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          },
          components: {
            Button: {
              primaryShadow: "none",
              defaultShadow: `${customToken.shadowBorder}, ${customToken.shadowSmall}`,
            },
            Table: {
              padding: 8,
              headerBg: "var(--ant-color-bg-container)",
              rowHoverBg: "var(--ant-color-bg-layout)",
              rowSelectedBg: "var(--ant-color-fill-tertiary)",
              rowSelectedHoverBg: "var(--ant-color-fill-tertiary)",
            },
            Input: {
              activeShadow: customToken.boxShadowControl,
            },
            Layout: {
              bodyBg: "transparent",
            },
            Menu: {
              itemColor: "var(--ant-color-text-secondary)",
              itemActiveBg: "var(--ant-color-fill-secondary)",
              itemHoverBg: "var(--ant-color-fill-tertiary)",
              itemSelectedBg: "var(--ant-color-fill-secondary)",
              itemSelectedColor: "var(--ant-color-text)",
              // @ts-expect-error custom value
              itemBorderRadius: "var(--ant-border-radius)",
            },
            Modal: {
              boxShadow: customToken.boxShadowModal,
              colorBgMask: "rgba(241, 241, 241, 0.8)",
            },
            Popover: {
              boxShadowSecondary: customToken.boxShadowModal,
            },
            Badge: {
              fontSize: 12,
              colorBgBase: "var(--ant-color-text)",
            },
            Select: {
              activeOutlineColor: "var(--ant-color-fill)",
              optionSelectedFontWeight: 400,
              optionActiveBg: "var(--ant-color-fill-tertiary)",
              optionSelectedBg: "var(--ant-color-fill-tertiary)",
              optionSelectedColor: "var(--ant-color-text)",
              boxShadowSecondary: customToken.boxShadowMenu,
            },
            DatePicker: {
              cellActiveWithRangeBg: "var(--ant-color-fill-secondary)",
              colorPrimary: "var(--ant-color-text)",
              colorPrimaryBg: "var(--ant-color-fill-tertiary)",
            },
            Dropdown: {
              controlItemBgActive: "var(--ant-color-fill-tertiary)",
              controlItemBgActiveHover: "var(--ant-color-fill-secondary)",
            },
          },
        }}
      >
        <App>
          <GlobalStyle />
          {children}
          <ModalStack />
        </App>
      </ThemeProvider>
    </AntdRegistry>
  );
};

declare module "antd-style" {
  export interface CustomToken {
    bgGradient: string;
    bgGradientAccent: string;
    shadowBorder: string;
    shadowSmall: string;
    boxShadowModal: string;
    boxShadowMenu: string;
    boxShadowPaper: string;
    boxShadowControl: string;
    stickyHeaderHeight: number;
    tableLayoutMinHeight: number;
    containerHeight: number;
  }
}
