export interface StoredObject {
  size: number;
  contentType: string;
}

export interface ObjectStorage {
  presignPut(
    key: string,
    contentType: string,
    expiresInSeconds?: number,
  ): Promise<string>;
  presignGet(key: string, expiresInSeconds: number): Promise<string>;
  stat(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
}
