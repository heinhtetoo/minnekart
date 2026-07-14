import { env } from './env';

export interface LegalEntity {
  name: string;
  abn: string;
  country: string;
}

// Not personal information, so this stays in the repo. The legal name, the ABN
// and the support address all come from the environment — see the business
// identity block in .env.example.
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

export function supportEmail(): string {
  return env().SUPPORT_EMAIL;
}

export function entityLine(entity: LegalEntity): string {
  return `${entity.name} (${entity.abn}), ${entity.country}`;
}
