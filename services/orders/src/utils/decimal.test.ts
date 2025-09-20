import { parseDecimalInput, isIntegerDecimal } from './decimal';

describe('decimal utils', () => {
  test('parses integer string', () => {
    expect(parseDecimalInput('123')).toEqual({ amount: '123', scale: 0 });
  });

  test('parses negative integer string', () => {
    expect(parseDecimalInput('-123')).toEqual({ amount: '-123', scale: 0 });
  });

  test('parses decimal string with trailing zeros', () => {
    expect(parseDecimalInput('12.3400')).toEqual({ amount: '1234', scale: 2 });
  });

  test('parses decimal string with leading zeros', () => {
    expect(parseDecimalInput('00012.0340')).toEqual({ amount: '12034', scale: 3 });
  });

  test('parses number', () => {
    expect(parseDecimalInput(12.34)).toEqual({ amount: '1234', scale: 2 });
  });

  test('rejects invalid input', () => {
    expect(parseDecimalInput('12.')).toBeNull();
    expect(parseDecimalInput('.34')).toBeNull();
    expect(parseDecimalInput('abc')).toBeNull();
    expect(parseDecimalInput(null as any)).toBeNull();
  });

  test('passes through IntegerDecimal object', () => {
    const v = { amount: '1000', scale: 2 };
    expect(isIntegerDecimal(v)).toBe(true);
    expect(parseDecimalInput(v)).toBe(v);
  });
});
