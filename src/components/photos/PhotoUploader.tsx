'use client';

import { useEffect, useState } from 'react';

import { photosPerTripFor } from '@/lib/billing/limits';
import { SignedPhoto } from '@/lib/photos/dto';
import { processImage } from '@/lib/photos/process';

import { photosApi, putBlob } from './api';
import SortablePhotoGrid from './SortablePhotoGrid';
import styles from './PhotoUploader.module.css';

const MAX_DISPLAY_BYTES = 8 * 1024 * 1024;

function uploadErrors(limitMessage: string): Record<string, string> {
  return {
    photo_limit_reached: limitMessage,
    rate_limited: 'Too many uploads at once. Please wait a moment.',
    invalid_upload: 'That file could not be processed. Try another.',
    invalid_key: 'Upload failed. Please try again.',
  };
}

type JobStatus = 'processing' | 'uploading' | 'saving' | 'error';

interface Job {
  id: string;
  name: string;
  status: JobStatus;
  error?: string;
}

const STATUS_LABEL: Record<JobStatus, string> = {
  processing: 'Processing…',
  uploading: 'Uploading…',
  saving: 'Saving…',
  error: 'Failed',
};

interface PhotoUploaderProps {
  tripId: string;
  plan: 'free' | 'paid';
}

export default function PhotoUploader({ tripId, plan }: PhotoUploaderProps) {
  const [photos, setPhotos] = useState<SignedPhoto[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState('');

  const maxPhotos = photosPerTripFor(plan);
  const limitMessage =
    plan === 'free'
      ? `This memory has all ${maxPhotos} photos of the free plan. ` +
        'Upgrade in Settings for more.'
      : `This memory already has ${maxPhotos} photos.`;
  const UPLOAD_ERRORS = uploadErrors(limitMessage);

  useEffect(() => {
    let active = true;
    photosApi.list(tripId).then((result) => {
      if (!active) return;
      setPhotos(result.data?.photos ?? []);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [tripId]);

  function patchJob(id: string, patch: Partial<Job>) {
    setJobs((current) =>
      current.map((job) => (job.id === id ? { ...job, ...patch } : job)),
    );
  }

  async function uploadOne(job: Job, file: File) {
    try {
      const processed = await processImage(file);
      if (processed.displayBlob.size > MAX_DISPLAY_BYTES) {
        patchJob(job.id, { status: 'error', error: 'Image is too large.' });
        return;
      }
      patchJob(job.id, { status: 'uploading' });
      const presign = await photosApi.presign(tripId, processed.contentType);
      if (!presign.ok || !presign.data) {
        patchJob(job.id, {
          status: 'error',
          error: UPLOAD_ERRORS[presign.error ?? ''] ?? 'Upload failed.',
        });
        return;
      }
      const { displayKey, thumbKey, displayUploadUrl, thumbUploadUrl } =
        presign.data;
      const [displayOk, thumbOk] = await Promise.all([
        putBlob(displayUploadUrl, processed.displayBlob),
        putBlob(thumbUploadUrl, processed.thumbBlob),
      ]);
      if (!displayOk || !thumbOk) {
        patchJob(job.id, {
          status: 'error',
          error: 'Upload to storage failed.',
        });
        return;
      }
      patchJob(job.id, { status: 'saving' });
      const created = await photosApi.createRecord(tripId, {
        displayKey,
        thumbKey,
        width: processed.width,
        height: processed.height,
        takenAt: processed.takenAt,
      });
      if (!created.ok || !created.data) {
        patchJob(job.id, {
          status: 'error',
          error: UPLOAD_ERRORS[created.error ?? ''] ?? 'Could not save photo.',
        });
        return;
      }
      setPhotos((current) => [...current, created.data!.photo]);
      setJobs((current) => current.filter((item) => item.id !== job.id));
    } catch (error) {
      patchJob(job.id, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Something went wrong.',
      });
    }
  }

  async function onFiles(fileList: FileList | null) {
    setBanner('');
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const active = jobs.filter((job) => job.status !== 'error').length;
    const remaining = maxPhotos - photos.length - active;
    if (remaining <= 0) {
      setBanner(limitMessage);
      return;
    }
    const accepted = files.slice(0, remaining);
    if (accepted.length < files.length) {
      setBanner(`Only ${remaining} more photo(s) can be added.`);
    }
    const pairs = accepted.map(
      (file) =>
        [
          {
            id: crypto.randomUUID(),
            name: file.name,
            status: 'processing' as JobStatus,
          },
          file,
        ] as const,
    );
    setJobs((current) => [...current, ...pairs.map(([job]) => job)]);
    await runPool(pairs, 2, ([job, file]) => uploadOne(job, file));
  }

  async function handleReorder(next: SignedPhoto[]) {
    const previous = photos;
    setPhotos(next.map((photo, index) => ({ ...photo, position: index })));
    const result = await photosApi.reorder(
      tripId,
      next.map((photo) => photo.id),
    );
    if (result.ok) {
      return;
    }
    setBanner('Could not save the new photo order.');
    const fresh = await photosApi.list(tripId);
    setPhotos(fresh.data?.photos ?? previous);
  }

  async function remove(photoId: string) {
    const result = await photosApi.remove(tripId, photoId);
    if (result.ok) {
      setPhotos((current) => current.filter((photo) => photo.id !== photoId));
    }
  }

  const count = photos.length;

  return (
    <section className={styles.wrap}>
      <div className={styles.head}>
        <h2 className={styles.heading}>Photos</h2>
        <span className={styles.count}>
          {count} / {maxPhotos}
        </span>
      </div>

      <label className={styles.dropzone}>
        <input
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          onChange={(event) => {
            onFiles(event.target.files);
            event.target.value = '';
          }}
          hidden
        />
        <span className={styles.dropTitle}>Add photos</span>
        <span className={styles.dropHint}>
          JPEG, PNG, WebP, or HEIC · resized and optimised in your browser
        </span>
      </label>

      {banner && <p className={styles.banner}>{banner}</p>}

      {jobs.length > 0 && (
        <ul className={styles.jobs}>
          {jobs.map((job) => (
            <li key={job.id} className={styles.job} data-status={job.status}>
              <span className={styles.jobName}>{job.name}</span>
              <span className={styles.jobStatus}>
                {job.status === 'error'
                  ? (job.error ?? STATUS_LABEL.error)
                  : STATUS_LABEL[job.status]}
              </span>
            </li>
          ))}
        </ul>
      )}

      {loading ? (
        <p className={styles.loading}>Loading photos…</p>
      ) : count === 0 ? (
        <p className={styles.loading}>No photos yet.</p>
      ) : (
        <SortablePhotoGrid
          photos={photos}
          onReorder={handleReorder}
          onRemove={remove}
        />
      )}
    </section>
  );
}

async function runPool<T>(
  items: readonly T[],
  size: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let index = 0;
  async function next(): Promise<void> {
    const current = index++;
    if (current >= items.length) return;
    await worker(items[current]);
    return next();
  }
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, () => next()),
  );
}
