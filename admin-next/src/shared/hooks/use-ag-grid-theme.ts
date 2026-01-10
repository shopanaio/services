"use client";

import { useMemo } from "react";
import {
  themeQuartz,
  colorSchemeDarkBlue,
  colorSchemeLight,
} from "ag-grid-community";
import { useThemeContext } from "@/ui-kit/theme";

export const useAgGridTheme = () => {
  const { isDark } = useThemeContext();

  const theme = useMemo(() => {
    return themeQuartz.withPart(isDark ? colorSchemeDarkBlue : colorSchemeLight);
  }, [isDark]);

  return theme;
};
