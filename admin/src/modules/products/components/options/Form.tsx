import { Label } from '@components/forms/Label';
import { SortableItem } from '@components/forms/SortableItem';
import { Flex } from '@components/utility/Flex';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { IProductOptionFormValues } from '@modules/products/components/options/schema';
import { filterById, getOnDragEnd, mapEntryId } from '@src/utils/utils';
import { Control, Controller } from 'react-hook-form';
import { OptionControl } from './OptionControl';
import { OptionValue } from './OptionValue';
import { Button, Typography } from 'antd';
import { syntheticId } from '@src/utils/synthetic-id';
import { MdAdd } from 'react-icons/md';
import { useIntl } from 'react-intl';

interface IOptionFormProps {
  control: Control<IProductOptionFormValues>;
}

export const OptionForm = ({ control }: IOptionFormProps) => {
  const intl = useIntl();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 1 } }),
  );

  return (
    <Controller
      name="features"
      control={control}
      render={({ field: { value: features, onChange: setFeatures } }) => (
        <Controller
          name="option"
          control={control}
          render={({ field: { value: option, onChange: setOption } }) => {
            const onCreateFeature = async (title: string) => {
              setFeatures([...(features || []), { title, id: syntheticId() }]);
            };
            return (
              <Flex w="100%" direction="column">
                {/* Main columns */}
                <Flex w="100%" direction="column">
                  <Label>
                    {intl.formatMessage({
                      id: 'products.options.optionName',
                    })}{' '}
                    <Typography.Text type="secondary">
                      {intl.formatMessage({
                        id: 'products.options.optionName.hint',
                      })}
                    </Typography.Text>
                  </Label>
                  <OptionControl
                    option={option}
                    setOption={setOption}
                    placeholder={intl.formatMessage({
                      id: 'products.options.example.color',
                    })}
                  />
                </Flex>
                <DndContext
                  sensors={sensors}
                  modifiers={[restrictToVerticalAxis]}
                  onDragEnd={getOnDragEnd(features, setFeatures)}
                >
                  <Flex w="100%" direction="column" mt="4">
                    <Label>
                      {intl.formatMessage({
                        id: 'products.options.optionValues',
                        defaultMessage: 'Option Values',
                      })}{' '}
                      <Typography.Text type="secondary">
                        {intl.formatMessage({
                          id: 'products.options.optionValues.hint',
                          defaultMessage: '(eg. Green, Medium, Cotton, etc.)',
                        })}
                      </Typography.Text>
                    </Label>
                    <SortableContext
                      items={(features || []).map(mapEntryId)}
                      strategy={verticalListSortingStrategy}
                    >
                      <Flex direction="column" gap="3">
                        {(features || []).map((it) => {
                          return (
                            <SortableItem id={it.id} key={it.id} name="feature">
                              <OptionValue
                                value={it}
                                placeholder={intl.formatMessage({
                                  id: 'products.options.example.green',
                                })}
                                groupStyle={option.style}
                                onChange={(feature) =>
                                  setFeatures(
                                    features.map((f) =>
                                      f.id === it.id ? feature : f,
                                    ),
                                  )
                                }
                                onDelete={() =>
                                  setFeatures(
                                    features.filter(filterById(it.id)),
                                  )
                                }
                              />
                            </SortableItem>
                          );
                        })}
                        <Button
                          data-testid="add-value-button"
                          onClick={() => {
                            onCreateFeature('');
                          }}
                          icon={<MdAdd />}
                        >
                          {intl.formatMessage({
                            id: 'products.options.addValue',
                          })}
                        </Button>
                      </Flex>
                    </SortableContext>
                  </Flex>
                </DndContext>
              </Flex>
            );
          }}
        />
      )}
    />
  );
};
