"use client";

import { GlobalStyle } from "@/ui-kit/theme/global-style";
import { App, theme as antTheme } from "antd";
import { ThemeProvider } from "antd-style";
import { AntdRegistry } from "@/ui-kit/theme/antd-registry";
import { ThemeContextProvider, useThemeContext } from "./theme-context";

const ThemeInner = ({ children }: { children: React.ReactNode }) => {
  const { isDark } = useThemeContext();

  return (
    <ThemeProvider
      appearance={isDark ? "dark" : "light"}
      theme={{
        cssVar: { prefix: "ant" },
        hashed: false,
        zeroRuntime: true,
        algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: {
          // colorLink: isDark ? "#8f8bfa" : "#2e1b74",
          // colorPrimary: isDark ? "#8f8bfa" : "#26175d",
          fontFamily:
            'var(--font-safiro), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        },
        components: {
          Button: {
            primaryShadow: "none",
          },
          Table: {
            padding: 8,
            headerBg: "var(--ant-color-bg-container)",
            rowHoverBg: "var(--ant-color-bg-layout)",
            rowSelectedBg: "var(--ant-color-fill-tertiary)",
            rowSelectedHoverBg: "var(--ant-color-fill-tertiary)",
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
      </App>
    </ThemeProvider>
  );
};

export const Theme = ({ children }: { children: React.ReactNode }) => {
  return (
    <AntdRegistry>
      <ThemeContextProvider>
        <ThemeInner>{children}</ThemeInner>
      </ThemeContextProvider>
    </AntdRegistry>
  );
};
