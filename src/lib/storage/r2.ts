import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { ObjectStorage, StoredObject } from './types';

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

const DEFAULT_PUT_EXPIRY = 300;

export class R2Storage implements ObjectStorage {
  private client: S3Client;
  private bucket: string;

  constructor(config: R2Config) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  presignPut(
    key: string,
    contentType: string,
    expiresInSeconds = DEFAULT_PUT_EXPIRY,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.client, command, {
      expiresIn: expiresInSeconds,
    });
  }

  presignGet(key: string, expiresInSeconds: number): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, {
      expiresIn: expiresInSeconds,
    });
  }

  async stat(key: string): Promise<StoredObject | null> {
    try {
      const head = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return {
        size: head.ContentLength ?? 0,
        contentType: head.ContentType ?? 'application/octet-stream',
      };
    } catch (error) {
      if (isNotFound(error)) {
        return null;
      }
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error.name === 'NotFound' || error.name === 'NoSuchKey')
  );
}
