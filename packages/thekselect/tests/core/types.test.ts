import { describe, it, expectTypeOf } from 'vitest';
import { ThekSelectConfig, ThekSelectOption } from '../../src/core/types';

interface ProductOption {
  id: number;
  name: string;
  category: string;
  disabled?: boolean;
}

describe('ThekSelectConfig type safety', () => {
  it('valueField accepts keyof T', () => {
    const config: ThekSelectConfig<ProductOption> = {
      options: [{ id: 1, name: 'Widget', category: 'tools' }],
      valueField: 'id',
      displayField: 'name'
    };
    expectTypeOf(config.valueField).toEqualTypeOf<keyof ProductOption & string | undefined>();
  });

  it('renderOption callback receives T directly', () => {
    const config: ThekSelectConfig<ProductOption> = {
      renderOption: (option) => {
        expectTypeOf(option).toEqualTypeOf<ProductOption>();
        return option.name;
      }
    };
    void config;
  });

  it('loadOptions returns Promise<T[]>', () => {
    const config: ThekSelectConfig<ProductOption> = {
      loadOptions: async (_query, _signal) => {
        const results: ProductOption[] = [{ id: 2, name: 'Gadget', category: 'tech' }];
        return results;
      }
    };
    void config;
  });

  it('default T is ThekSelectOption', () => {
    const config: ThekSelectConfig = {
      options: [{ value: '1', label: 'One' }]
    };
    expectTypeOf(config.options).toEqualTypeOf<ThekSelectOption[] | undefined>();
  });
});

// Compile-time rejection tests — these must NOT be removed or the guard is gone.

// @ts-expect-error: 'nonexistent' is not keyof ProductOption
const _badValueField: ThekSelectConfig<ProductOption> = { valueField: 'nonexistent' };

// @ts-expect-error: number is not a valid option shape (must extend object)
type _badConstraint = ThekSelectConfig<number>;
