import { env } from './env';

export interface LegalEntity {
  name: string;
  abn: string;
  country: string;
}

// Not personal information, so these stay in the repo. The legal name and the
// ABN come from the environment — see the business identity block in
// .env.example.
export const SUPPORT_EMAIL = 'hello@minnekart.com';
const COUNTRY = 'Australia';

const PLACEHOLDER_NAME = 'HHO';
const PLACEHOLDER_ABN = 'ABN XXXX XXXX XXX';

export function legalEntity(): LegalEntity {
  const { LEGAL_ENTITY_NAME, LEGAL_ENTITY_ABN } = env();
  return {
    name: LEGAL_ENTITY_NAME?.trim() || PLACEHOLDER_NAME,
    abn: LEGAL_ENTITY_ABN?.trim() || PLACEHOLDER_ABN,
    country: COUNTRY,
  };
}

export function entityLine(entity: LegalEntity): string {
  return `${entity.name} (${entity.abn}), ${entity.country}`;
}
