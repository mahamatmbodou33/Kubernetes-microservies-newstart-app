import { afterEach, describe, expect, it } from 'vitest';
import { getEnvBool, getEnvList, getEnvNumber, requireEnv } from '../src/index.js';

const KEY = 'NEWSTART_TEST_VAR';

afterEach(() => {
  delete process.env[KEY];
});

describe('config helpers', () => {
  it('requireEnv returns the value or throws when missing', () => {
    process.env[KEY] = 'hello';
    expect(requireEnv(KEY)).toBe('hello');
    delete process.env[KEY];
    expect(() => requireEnv(KEY)).toThrow(/Missing required/);
  });

  it('getEnvNumber parses numbers and falls back', () => {
    expect(getEnvNumber(KEY, 42)).toBe(42);
    process.env[KEY] = '100';
    expect(getEnvNumber(KEY, 42)).toBe(100);
    process.env[KEY] = 'not-a-number';
    expect(() => getEnvNumber(KEY, 42)).toThrow(/must be a number/);
  });

  it('getEnvBool interprets common truthy values', () => {
    expect(getEnvBool(KEY, false)).toBe(false);
    for (const v of ['1', 'true', 'YES', 'on']) {
      process.env[KEY] = v;
      expect(getEnvBool(KEY, false)).toBe(true);
    }
    process.env[KEY] = 'no';
    expect(getEnvBool(KEY, true)).toBe(false);
  });

  it('getEnvList splits, trims and drops empties', () => {
    expect(getEnvList(KEY, ['a'])).toEqual(['a']);
    process.env[KEY] = ' x , y ,, z ';
    expect(getEnvList(KEY)).toEqual(['x', 'y', 'z']);
  });
});
