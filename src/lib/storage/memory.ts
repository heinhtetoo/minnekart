import { ObjectStorage, StoredObject } from './types';

const DEFAULT_OBJECT_SIZE = 120_000;

export class MemoryStorage implements ObjectStorage {
  private objects = new Map<string, StoredObject>();

  async presignPut(key: string, contentType: string): Promise<string> {
    this.objects.set(key, { size: DEFAULT_OBJECT_SIZE, contentType });
    return `memory://put/${key}`;
  }

  async presignGet(key: string, expiresInSeconds: number): Promise<string> {
    return `memory://get/${key}?exp=${expiresInSeconds}`;
  }

  async stat(key: string): Promise<StoredObject | null> {
    return this.objects.get(key) ?? null;
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key);
  }

  seed(key: string, object: StoredObject): void {
    this.objects.set(key, object);
  }

  reset(): void {
    this.objects.clear();
  }
}
