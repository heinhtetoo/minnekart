import { describe, expect, it } from 'vitest';

import { entityLine, legalEntity, supportEmail } from './legal';

describe('entityLine', () => {
  it('reads as name, registration and country', () => {
    const line = entityLine({
      name: 'Test Pty Ltd',
      abn: 'ABN 12 345 678 901',
      country: 'Australia',
    });
    expect(line).toBe('Test Pty Ltd (ABN 12 345 678 901), Australia');
  });
});

describe('legalEntity', () => {
  it('falls back to visible placeholders when the env is not configured', () => {
    const entity = legalEntity();
    expect(entity.name).toBe('HHO');
    expect(entity.abn).toBe('ABN XXXX XXXX XXX');
    expect(entity.country).toBe('Australia');
  });
});

describe('supportEmail', () => {
  it('returns the configured address rather than a hardcoded one', () => {
    expect(supportEmail()).toBe('support@minnekart.test');
  });
});
