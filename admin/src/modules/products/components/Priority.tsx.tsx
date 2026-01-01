import { Label } from '@components/forms/Label';
import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { PriorityLabels, ProductPriority } from '@src/defs/constants';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { Select } from 'antd';
import { Controller } from 'react-hook-form';

export const Priority = () => {
  return (
    <DrawerPaper>
      <DrawerPaperHeader title="Priority" name="prior" />
      <Flex direction="column" gap="4">
        <Controller
          name="priority"
          render={({ field, fieldState }) => {
            return (
              <Box>
                <Label required>Priority</Label>
                <Select
                  value={field.value}
                  onChange={field.onChange}
                  options={[
                    ProductPriority.Critical,
                    ProductPriority.High,
                    ProductPriority.Moderate,
                    ProductPriority.Low,
                    ProductPriority.Minimal,
                  ].map((value) => ({
                    label: PriorityLabels[value],
                    value,
                    'data-testid': `stock-priority-option-${value}`,
                  }))}
                  style={{ width: '100%' }}
                  placeholder="Priority"
                  status={fieldState?.invalid ? 'error' : undefined}
                  data-testid="priority-select"
                />
              </Box>
            );
          }}
        />
      </Flex>
    </DrawerPaper>
  );
};
