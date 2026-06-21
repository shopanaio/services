"use client";

import { Controller, useFormContext } from "react-hook-form";
import { Checkbox, Typography } from "antd";
import { createStyles } from "antd-style";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import type { CreateWarehouseFormValues } from "./types";

const useStyles = createStyles(({ token }) => ({
  help: {
    display: "block",
    marginTop: 4,
    marginLeft: 24,
    color: token.colorTextSecondary,
    fontSize: 12,
  },
}));

export function BehaviorSection() {
  const { styles } = useStyles();
  const { control } = useFormContext<CreateWarehouseFormValues>();

  return (
    <Paper>
      <PaperHeader title="Behavior" />
      <Controller
        name="isDefault"
        control={control}
        render={({ field }) => (
          <>
            <Checkbox
              checked={field.value}
              onChange={(event) => field.onChange(event.target.checked)}
              data-testid="create-warehouse-default-checkbox"
            >
              Set as default warehouse
            </Checkbox>
            <Typography.Text className={styles.help}>
              New inventory and fallback stock operations use the default.
            </Typography.Text>
          </>
        )}
      />
    </Paper>
  );
}
