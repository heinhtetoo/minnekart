import { describe, expect, it } from 'vitest';

import { parseEnv } from './env';

const validSource = {
  DATABASE_URL: 'postgresql://postgres:password@localhost:5433/minnekart',
};

describe('parseEnv', () => {
  it('accepts a valid postgres DATABASE_URL and applies defaults', () => {
    const env = parseEnv(validSource);

    expect(env.DATABASE_URL).toBe(validSource.DATABASE_URL);
    expect(env.APP_URL).toBe('http://localhost:3000');
    expect(env.NODE_ENV).toBe('development');
  });

  it('rejects a missing DATABASE_URL with a message naming the variable', () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL/);
  });

  it('rejects a DATABASE_URL that is not a postgres URL', () => {
    expect(() => parseEnv({ DATABASE_URL: 'https://example.com' })).toThrow(
      /DATABASE_URL/,
    );
  });
});
