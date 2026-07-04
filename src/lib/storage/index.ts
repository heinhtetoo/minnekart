import { env } from '@/lib/env';

import { MemoryStorage } from './memory';
import { R2Storage } from './r2';
import { ObjectStorage } from './types';

let instance: ObjectStorage | undefined;

export function storage(): ObjectStorage {
  instance ??= createStorage();
  return instance;
}

function createStorage(): ObjectStorage {
  if (env().STORAGE_DRIVER === 'memory') {
    return new MemoryStorage();
  }
  return new R2Storage(requireR2Config());
}

function requireR2Config() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } =
    env();
  if (
    !R2_ACCOUNT_ID ||
    !R2_ACCESS_KEY_ID ||
    !R2_SECRET_ACCESS_KEY ||
    !R2_BUCKET
  ) {
    throw new Error(
      'STORAGE_DRIVER=r2 requires R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, ' +
        'R2_SECRET_ACCESS_KEY, and R2_BUCKET',
    );
  }
  return {
    accountId: R2_ACCOUNT_ID,
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    bucket: R2_BUCKET,
  };
}

export function getMemoryStorage(): MemoryStorage {
  const current = storage();
  if (!(current instanceof MemoryStorage)) {
    throw new Error('Storage driver is not memory');
  }
  return current;
}

export function resetMemoryStorage(): void {
  getMemoryStorage().reset();
}
